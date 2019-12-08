import * as assert from "assert";
import * as fetchMock from "fetch-mock";
import { suite, test } from "mocha-typescript";
import * as Redux from "redux";
import thunk from "redux-thunk";
import { Controller } from "./controller";

function promiseState(p) {
  const t = {};
  return Promise.race([p, t]).then(
    v => (v === t ? "pending" : "fulfilled"),
    () => "rejected"
  );
}

class TestController extends Controller {
  onAsyncSuccess: boolean = false;
  onAsyncFailed: boolean = false;
  constructor() {
    super("test", { someInfos: true });
  }

  init() {
    super.init();
    return false;
  }

  localState() {
    return this.getLocalState();
  }

  state() {
    return this.getState();
  }

  async launchActionEmpty() {
    return new Promise(resolve => {
      this.asyncAction(
        "TEST_ASYNC",
        async () => {
          await this.ajax("/TestEmpty", "GET");
        },
        resolve
      );
    });
  }

  async launchActionError() {
    return new Promise(resolve => {
      this.asyncAction("TEST_ASYNC", async () => {
        await this.ajax("/TestError", "GET");
      });
      // Use a 10ms delay as we want to test error
      setTimeout(resolve, 10);
    });
  }

  async launchActionRedirect() {
    return new Promise(resolve => {
      this.asyncAction("TEST_ASYNC", async () => {
        await this.ajax("/TestRedirect", "GET");
      });
      // Use a 10ms delay as we want to test error
      setTimeout(resolve, 10);
    });
  }

  async launchActionOk() {
    return new Promise(resolve => {
      this.asyncAction(
        "TEST_ASYNC",
        async () => {
          await this.ajax("/TestOk", "GET");
        },
        resolve
      );
    });
  }

  onTEST_ACTION() {
    this.setInitialized();
  }

  onTEST_ASYNC_SUCCESS() {
    this.onAsyncSuccess = true;
  }

  onTEST_ASYNC_FAILED() {
    this.onAsyncFailed = true;
  }

  reset() {
    this.onAsyncSuccess = this.onAsyncFailed = false;
  }
}
let testController = new TestController();

class Test2Controller extends Controller {
  constructor() {
    super("listeners");
  }

  localState() {
    return this.getLocalState();
  }

  launchAction() {
    Controller.dispatch({ type: "TEST_ACTION" });
  }

  async launchAsyncAction() {
    return new Promise(resolve => {
      this.asyncAction("TEST_ASYNC", async () => {
        await this.ajax("/TestOk");
      });
      setTimeout(resolve, 10);
    });
  }

  async launchAsyncActionFailure() {
    return new Promise(resolve => {
      this.asyncAction("TEST_ASYNC", async () => {
        await this.ajax("/TestError");
      });
      setTimeout(resolve, 10);
    });
  }

  afterTEST_ASYNC_SUCCESS() {}
}
let test2Controller = new Test2Controller();

fetchMock.mock("http://localhost:18080/TestEmpty", 204);
fetchMock.mock("http://localhost:18080/TestOk", {
  newAttr: "attr"
});
fetchMock.mock("http://localhost:18080/TestRedirect", 302);
fetchMock.mock("http://localhost:18080/TestError", 401);

@suite
class ReduxControllerTest {
  controller: Controller;
  store: any;
  before() {
    this.store = Redux.createStore(Controller.getReducers(), Redux.applyMiddleware(thunk));
    Controller.setStore(this.store);
    assert.equal(Controller.getStore(), this.store);
  }

  @test
  async ajax() {
    Controller.setEndpoint("http://localhost:18080");
    await testController.launchActionEmpty();
    assert.equal(testController.onAsyncFailed, false);
    assert.equal(testController.onAsyncSuccess, true);
    testController.reset();
    await testController.launchActionError();
    assert.equal(testController.onAsyncFailed, true);
    assert.equal(testController.onAsyncSuccess, false);
    testController.reset();
    await testController.launchActionOk();
    assert.equal(testController.onAsyncFailed, false);
    assert.equal(testController.onAsyncSuccess, true);
    testController.reset();
    await testController.launchActionRedirect();
    assert.equal(testController.onAsyncFailed, false);
    assert.equal(testController.onAsyncSuccess, true);
    testController.reset();
    let promise = testController.waitInit();
    assert.equal(await promiseState(promise), "pending");
    // Will launch the onTEST_ACTION that will finish the init of testController with afterTEST_ACTION
    test2Controller.launchAction();
    await promise;
    await testController.waitInit();
    assert.equal(await promiseState(promise), "fulfilled");
  }

  @test
  async undefinedReducer() {
    await test2Controller.launchAsyncAction();
    await test2Controller.launchAsyncActionFailure();
  }

  @test
  getController() {
    assert.notEqual(Controller.get("test"), undefined);
    assert.notEqual(Controller.get("listeners"), undefined);
    assert.equal(Controller.get("test2"), undefined);
  }

  @test
  getState() {
    assert.notEqual(testController.localState(), undefined);
    assert.equal(testController.localState().someInfos, true);
    assert.notEqual(testController.state(), undefined);
    assert.equal(testController.state().test.someInfos, true);
  }
}
