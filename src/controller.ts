import * as Redux from "redux";

export class HTTPError {
  code: number;
  constructor(code: number) {
    this.code = code;
  }
}

export default class Controller {
  defaultState: any = {};
  id: string;
  protected static store: Redux.Store;
  protected static controllers: Map<string, Controller> = new Map();
  protected static endpoint: string;
  protected static hasListener: boolean = false;
  protected static listenersMap: Map<string, Array<Controller>> = new Map();
  protected static lastAction: any;
  protected _init: boolean = false;
  protected _initPromises: any[] = [];

  /**
   * @param id is the key that the controller manage in the state
   * @param defaultState default value of the state
   */
  constructor(id: string, defaultState: any = {}) {
    this.id = id;
    this.defaultState = { _async: {}, ...defaultState };
    Controller.controllers[id] = this;
  }

  /**
   * Set the status of the controller to initialized, resolve any promise on waitInit()
   */
  protected setInitialized(): void {
    this._init = true;
    this._initPromises.forEach((res) => res());
  }

  /**
   * Wait for the controller to be initialized
   */
  public waitInit(): Promise<void> {
    if (this._init) {
      return;
    }
    return new Promise((resolve) => {
      this._initPromises.push(resolve);
    });
  }

  /**
   * @param id get controller singleton
   */
  public static get<T extends Controller>(id: string): T {
    return <T>Controller.controllers[id];
  }

  /**
   *
   * @param url of the default api endpoint
   */
  public static setEndpoint(url: string) {
    Controller.endpoint = url;
  }

  /**
   * Get Reducer
   */
  protected getReducer() {
    return this.reduce.bind(this);
  }

  /**
   * Retrieve the all Redux state
   */
  protected getState(): any {
    return Controller.store.getState();
  }

  /**
   * Retrieve the Redux state manage by this controller
   */
  protected getLocalState(): any {
    return Controller.store.getState()[this.id];
  }

  /**
   * Return controller id
   */
  public getId(): string {
    return this.id;
  }

  /**
   * Redux store to manage
   * @param store
   */
  public static setStore(store) {
    Controller.store = store;
    for (let i in Controller.controllers) {
      if (Controller.controllers[i].init()) {
        Controller.controllers[i].setInitialized();
      }
    }
  }

  /**
   * Retrieve Redux Store
   */
  public static getStore() {
    return Controller.store;
  }

  /**
   * Get all reduucers
   */
  public static getReducers(persist = undefined, storage = undefined): Redux.Reducer {
    let mapper = {};
    for (let i in Controller.controllers) {
      // Allow persistance layer
      if (persist && Controller.controllers[i].getPersistanceConfiguration(storage)) {
        mapper[Controller.controllers[i].getId()] = persist(
          Controller.controllers[i].getPersistanceConfiguration(storage),
          Controller.controllers[i].getReducer()
        );
      } else {
        mapper[Controller.controllers[i].getId()] = Controller.controllers[i].getReducer();
      }
    }
    return Redux.combineReducers(mapper);
  }

  /**
   * Prevent to store the _async information
   * @param storage
   */
  getPersistanceConfiguration(storage): any {
    return {
      key: this.id,
      storage: storage,
      blacklist: ["_async"],
    };
  }

  /**
   * Init the controller
   *
   * Registering the listeners
   */
  protected init() {
    Object.getOwnPropertyNames(Object.getPrototypeOf(this))
      .filter((prop) => {
        return prop.startsWith("after");
      })
      .forEach((name) => {
        this.addListener(name, this);
      });
    return true;
  }

  /**
   *
   * @param name
   * @param controller
   */
  addListener(name: string, controller: Controller) {
    if (!Controller.hasListener) {
      Controller.getStore().subscribe(Controller._actionListener);
      Controller.hasListener = true;
    }
    if (!Controller.listenersMap[name]) {
      Controller.listenersMap[name] = [this];
    } else {
      Controller.listenersMap[name].push(this);
    }
  }

  _lastAction: any;

  /**
   *
   * @param args
   */
  protected static _actionListener(...args) {
    let key = "after" + Controller.lastAction.type;
    if (!Controller.listenersMap[key]) {
      return;
    }
    Controller.listenersMap[key].forEach((controller) => {
      controller[key](Controller.lastAction);
    });
  }

  /**
   *
   * @param state
   * @param action
   */
  reduce(state, action) {
    if (!state) {
      return this.defaultState;
    }
    Controller.lastAction = action;
    if (typeof this["on" + action.type] === "function") {
      let res = this["on" + action.type](state, action);
      if (!res) {
        return state;
      }
      return res;
    }
    return state;
  }

  /**
   * Dispatch an action to Redux Store
   *
   * @param action
   */
  static dispatch(action: any) {
    Controller.store.dispatch(action);
  }

  /**
   * When asyncAction is used
   *
   * The first action sent is this one
   * @param name
   */
  getRequestActionName(name) {
    return name + "";
  }

  /**
   * When asyncAction is used, if successull
   *
   * The action sent when async action is successfull
   * @param name
   */
  getSuccessActionName(name) {
    return name + "_SUCCESS";
  }

  /**
   * When asyncAction is used, if failed
   *
   * The action sent when async action is in error
   * @param name
   */
  getErrorActionName(name) {
    return name + "_FAILED";
  }

  /**
   * Launch an async action
   *
   * By default, if name is GET_USER it will send an action with
   *  - GET_USER
   *  - GET_USER_SUCCESS -> if success
   *  - GET_USER_FAILED -> if error
   *
   * The Redux state will contain a
   * _async: {
   *  GET_USER: {
   *   syncing: true|false,
   *   error: undefined|HTTPError
   *  }
   * }
   * @param name of the action like GET_USER
   * @param action any additional informations you want to pass
   * @param postActions callback to execute after the action
   * @param postFailures callback to execute after the action failed
   */
  protected asyncAction(
    name: string,
    action: any,
    postActions: (...args) => void = undefined,
    postFailures: (...args) => void = undefined
  ) {
    Controller.dispatch(async (dispatch, getState) => {
      let requestName = this.getRequestActionName(name);
      if (!this["on" + requestName]) {
        this["on" + requestName] = (state) => {
          let obj = { ...state };
          obj._async = obj._async || {};
          obj._async[requestName] = { syncing: true };
          return obj;
        };
      }
      dispatch({ type: requestName, asyncStart: true });
      try {
        let successName = this.getSuccessActionName(name);
        let result = await action(dispatch, getState);
        if (!this["on" + successName]) {
          this["on" + successName] = (state, actionInfo) => {
            let obj = { ...state, ...actionInfo.result };
            obj._async = obj._async || {};
            obj._async[requestName] = { syncing: false };
            return obj;
          };
        }
        dispatch({ type: successName, asyncEnd: true, result: result });
      } catch (err) {
        this.onAsyncActionError(name, requestName, dispatch, postFailures, err);
      }
      if (postActions) {
        postActions(dispatch, getState);
      }
    });
  }

  /**
   *
   * @param name of the action
   * @param requestName request name stored in async
   * @param dispatch dispatch function
   * @param postFailures callback to execute after the action failed
   * @param err error that occured
   */
  protected onAsyncActionError(name, requestName, dispatch, postFailures, err) {
    let errorName = this.getErrorActionName(name);
    if (!this["on" + errorName]) {
      this["on" + errorName] = (state, actionInfo) => {
        let obj = { ...state };
        obj._async = obj._async || {};
        obj._async[requestName] = { syncing: false, error: actionInfo.error };
        return obj;
      };
    }
    dispatch({ type: errorName, asyncEnd: true, error: err });
    if (postFailures) {
      postFailures(err);
    }
    return;
  }

  /**
   *
   * @param url path
   * @param method GET|POST|PUT|PATCH
   * @param body to send
   * @param options options to pass to fetch
   * @param endpoint
   */
  async ajax(
    url: string,
    method: string = "GET",
    body: any = undefined,
    options: any = { credentials: "include", headers: {} },
    endpoint: string = Controller.endpoint
  ) {
    options.body = JSON.stringify(body);
    options.headers = {
      "content-type":
        options.headers && options.headers["content-type"] ? options.headers["content-type"] : "application/json",
    };
    options.method = method;
    return this.processResponse(await fetch(endpoint + url, options), {
      url: endpoint + url,
      ...options,
    });
  }

  /**
   * Return an absolute url from relative path
   * @param path
   */
  public static getUrl(path: string): string {
    return Controller.endpoint + path;
  }

  /**
   * Parse response
   * @param response to parse
   */
  processResponse(response: Response, request: Request): any {
    if (response.status >= 400) {
      throw new HTTPError(response.status);
    }
    if (response.status === 204) {
      return {};
    }
    if (response.status === 200 && response.headers.get("content-type") === "application/json") {
      return response.json();
    }
    return response;
  }
}

export { Controller };
