import * as assert from "assert";
import * as fetchMock from "fetch-mock";
import { suite, test } from "mocha-typescript";
import * as Redux from "redux";
import thunk from "redux-thunk";
import { Controller } from "./controller";

class TestController extends Controller {
  constructor() {
    super("test", {});
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

  launchActionEmpty() {
    this.asyncAction(
      "TEST_ASYNC",
      async () => {
        await this.ajax("/TestEmpty", "GET");
      },
      () => {}
    );
  }

  launchActionError() {
    this.asyncAction(
      "TEST_ASYNC",
      async () => {
        await this.ajax("/TestError", "GET");
      },
      () => {}
    );
  }

  launchActionRedirect() {
    this.asyncAction(
      "TEST_ASYNC",
      async () => {
        await this.ajax("/TestRedirect", "GET");
      },
      () => {}
    );
  }

  launchActionOk() {
    this.asyncAction(
      "TEST_ASYNC",
      async () => {
        await this.ajax("/TestOk", "GET");
      },
      () => {}
    );
  }

  onTEST_ACTION() {
    this.setInitialized();
  }

  onTEST_ASYNC_SUCCESS() {}

  onTEST_ASYNC_FAILED() {}
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

  launchAsyncAction() {
    this.asyncAction("TEST_ASYNC", async () => {
      await this.ajax("/TestOk");
    });
  }

  launchAsyncActionFailure() {
    this.asyncAction("TEST_ASYNC", async () => {
      await this.ajax("/TestError");
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
    testController.launchActionEmpty();
    testController.launchActionError();
    testController.launchActionOk();
    testController.launchActionRedirect();
    let promise = testController.waitInit();
    // check prommise is pending
    test2Controller.launchAction();
    await promise;
    await testController.waitInit();
  }

  @test
  undefinedReducer() {
    test2Controller.launchAsyncAction();
    test2Controller.launchAsyncActionFailure();
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
    assert.notEqual(testController.state(), undefined);
  }
}
