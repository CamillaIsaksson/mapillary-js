/// <reference path="../../typings/index.d.ts" />

import {BehaviorSubject} from "rxjs/BehaviorSubject";
import {Observable} from "rxjs/Observable";
import {ReplaySubject} from "rxjs/ReplaySubject";
import {Subscription} from "rxjs/Subscription";

import "rxjs/add/observable/throw";

import "rxjs/add/operator/do";
import "rxjs/add/operator/finally";
import "rxjs/add/operator/first";
import "rxjs/add/operator/map";
import "rxjs/add/operator/mergeMap";

import {
    APIv3,
    IFullNode,
} from "../API";
import {
    FilterExpression,
    Graph,
    GraphService,
    IEdgeStatus,
    ImageLoadingService,
    Node,
} from "../Graph";
import {EdgeDirection} from "../Edge";
import {
    StateService,
    IFrame,
} from "../State";
import {
    CacheService,
    LoadingService,
} from "../Viewer";

export class Navigator {
    private _apiV3: APIv3;

    private _cacheService: CacheService;
    private _graphService: GraphService;
    private _imageLoadingService: ImageLoadingService;
    private _loadingService: LoadingService;
    private _loadingName: string;
    private _stateService: StateService;

    private _keyRequested$: BehaviorSubject<string>;
    private _movedToKey$: BehaviorSubject<string>;

    private _request$: ReplaySubject<Node>;
    private _requestSubscription: Subscription;
    private _nodeRequestSubscription: Subscription;

    constructor (
        clientId: string,
        token?: string,
        apiV3?: APIv3,
        graphService?: GraphService,
        imageLoadingService?: ImageLoadingService,
        loadingService?: LoadingService,
        stateService?: StateService,
        cacheService?: CacheService) {

        this._apiV3 = apiV3 != null ? apiV3 : new APIv3(clientId, token);

        this._imageLoadingService = imageLoadingService != null ? imageLoadingService : new ImageLoadingService();

        this._graphService = graphService != null ?
            graphService :
            new GraphService(new Graph(this.apiV3), this._imageLoadingService);

        this._loadingService = loadingService != null ? loadingService : new LoadingService();
        this._loadingName = "navigator";

        this._stateService = stateService != null ? stateService : new StateService();

        this._cacheService = cacheService != null ?
            cacheService :
            new CacheService(this._graphService, this._stateService);

        this._cacheService.start();

        this._keyRequested$ = new BehaviorSubject<string>(null);
        this._movedToKey$ = new BehaviorSubject<string>(null);

        this._request$ = null;
        this._requestSubscription = null;
        this._nodeRequestSubscription = null;
    }

    public get apiV3(): APIv3 {
        return this._apiV3;
    }

    public get graphService(): GraphService {
        return this._graphService;
    }

    public get imageLoadingService(): ImageLoadingService {
        return this._imageLoadingService;
    }

    public get loadingService(): LoadingService {
        return this._loadingService;
    }

    public get movedToKey$(): Observable<string> {
        return this._movedToKey$;
    }

    public get stateService(): StateService {
        return this._stateService;
    }

    public moveToKey$(key: string): Observable<Node> {
        this._abortRequest(`to key ${key}`);

        this._loadingService.startLoading(this._loadingName);

        const node$: Observable<Node> = this._moveToKey$(key);

        return this._makeRequest$(node$);
    }

    public moveDir$(direction: EdgeDirection): Observable<Node> {
        this._abortRequest(`in dir ${EdgeDirection[direction]}`);

        this._loadingService.startLoading(this._loadingName);

        const node$: Observable<Node> = this.stateService.currentNode$
            .first()
            .mergeMap(
                (node: Node): Observable<string> => {
                    return ([EdgeDirection.Next, EdgeDirection.Prev].indexOf(direction) > -1 ?
                        node.sequenceEdges$ :
                        node.spatialEdges$)
                            .first()
                            .map(
                                (status: IEdgeStatus): string => {
                                    for (let edge of status.edges) {
                                        if (edge.data.direction === direction) {
                                            return edge.to;
                                        }
                                    }

                                    return null;
                                });
                })
            .mergeMap(
                (directionKey: string) => {
                    if (directionKey == null) {
                        this._loadingService.stopLoading(this._loadingName);

                        return Observable
                            .throw(new Error(`Direction (${direction}) does not exist for current node.`));
                    }

                    return this._moveToKey$(directionKey);
                });

        return this._makeRequest$(node$);
    }

    public moveCloseTo$(lat: number, lon: number): Observable<Node> {
        this._abortRequest(`to lat ${lat}, lon ${lon}`);

        this._loadingService.startLoading(this._loadingName);

        const node$: Observable<Node> = this.apiV3.imageCloseTo$(lat, lon)
            .mergeMap(
                (fullNode: IFullNode): Observable<Node> => {
                    if (fullNode == null) {
                        this._loadingService.stopLoading(this._loadingName);

                        return Observable
                            .throw(new Error(`No image found close to lat ${lat}, lon ${lon}.`));
                    }

                    return this._moveToKey$(fullNode.key);
                });

        return this._makeRequest$(node$);
    }

    public setFilter$(filter: FilterExpression): Observable<void> {
        this._stateService.clearNodes();

        return this._movedToKey$
            .first()
            .mergeMap(
                (key: string): Observable<Node> => {
                    if (key != null) {
                        return this._trajectoryKeys$()
                            .mergeMap(
                                (keys: string[]): Observable<Node> => {
                                    return this._graphService.setFilter$(filter)
                                        .mergeMap(
                                            (graph: Graph): Observable<Node> => {
                                                return this._cacheKeys$(keys);
                                            });
                                })
                            .last();
                    }

                    return this._keyRequested$
                        .first()
                        .mergeMap(
                            (requestedKey: string): Observable<Node> => {
                                if (requestedKey != null) {
                                    return this._graphService.setFilter$(filter)
                                        .mergeMap(
                                            (graph: Graph): Observable<Node> => {
                                                return this._graphService.cacheNode$(requestedKey);
                                            });
                                }

                                return this._graphService.setFilter$(filter)
                                    .map(
                                        (graph: Graph): Node => {
                                            return undefined;
                                        });
                            });
                })
            .map(
                (node: Node): void => {
                    return undefined;
                });
    }

    public setToken$(token?: string): Observable<void> {
        this._abortRequest("to set token");

        this._stateService.clearNodes();

        return this._movedToKey$
            .first()
            .do(
                (key: string): void => {
                    this._apiV3.setToken(token);
                })
            .mergeMap(
                (key: string): Observable<void> => {
                    return key == null ?
                        this._graphService.reset$([])
                            .map(
                                (graph: Graph): void => {
                                    return undefined;
                                }) :
                        this._trajectoryKeys$()
                            .mergeMap(
                                (keys: string[]): Observable<Node> => {
                                    return this._graphService.reset$(keys)
                                        .mergeMap(
                                            (graph: Graph): Observable<Node> => {
                                                return this._cacheKeys$(keys);
                                            });
                                })
                            .last()
                            .map(
                                (node: Node): void => {
                                    return undefined;
                                });
                    });
    }

    private _cacheKeys$(keys: string[]): Observable<Node> {
        let cacheNodes$: Observable<Node>[] = keys
            .map(
                (key: string): Observable<Node> => {
                        return this._graphService.cacheNode$(key);
                });

        return Observable
            .from<Observable<Node>>(cacheNodes$)
            .mergeAll();
    }

    private _abortRequest(reason: string): void {
        if (this._requestSubscription != null) {
            this._requestSubscription.unsubscribe();
            this._requestSubscription = null;
        }

        if (this._nodeRequestSubscription != null) {
            this._nodeRequestSubscription.unsubscribe();
            this._nodeRequestSubscription = null;
        }

        if (this._request$ != null) {
            this._request$.error(new Error(`Request aborted by a subsequent request ${reason}.`));
            this._request$ = null;
        }
    }

    private _makeRequest$(node$: Observable<Node>): Observable<Node> {
        this._request$ = new ReplaySubject<Node>(1);
        this._requestSubscription = this._request$
            .subscribe(undefined, (e: Error): void => { /*noop*/ });

        this._nodeRequestSubscription = node$
            .subscribe(
                (node: Node): void => {
                    this._request$.next(node);
                    this._request$.complete();
                },
                (error: Error): void => {
                    this._request$.error(error);
                });

        return this._request$;
    }

    private _moveToKey$(key: string): Observable<Node> {
        this._keyRequested$.next(key);

        return this._graphService.cacheNode$(key)
            .do(
                (node: Node) => {
                    this._stateService.setNodes([node]);
                    this._movedToKey$.next(node.key);
                })
            .finally(
                (): void => {
                    this._loadingService.stopLoading(this._loadingName);
                });
    }

    private _trajectoryKeys$(): Observable<string[]> {
        return this._stateService.currentState$
            .first()
            .map(
                (frame: IFrame): string[] => {
                    return frame.state.trajectory
                            .map(
                                (node: Node): string => {
                                    return node.key;
                                });
                });
    }
}

export default Navigator;
