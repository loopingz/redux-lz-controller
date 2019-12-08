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
        await this.ajax("/Test", "GET");
      },
      () => {}
    );
  }

  onTEST_ACTION() {}

  onTEST_ASYNC_SUCCESS() {}

  onTEST_ASYNC_FAILURE() {}
}
let testController = new TestController();

class Test2Controller extends Controller {
  constructor() {
    super("listeners", {});
  }

  localState() {
    return this.getLocalState();
  }

  afterTEST_ACTION() {}

  afterTEST_ASYNC_SUCCESS() {}
}
let test2Controller = new Test2Controller();

@suite
class ReduxControllerTest {
  controller: Controller;
  store: any;
  before() {
    this.store = Redux.createStore(Controller.getReducers(), Redux.applyMiddleware(thunk));
    Controller.setStore(this.store);
    assert.equal(Controller.getStore(), this.store);
    fetchMock.mock("http://localhost:18080/TestEmpty", 204);
    fetchMock.mock("http://localhost:18080/TestOk", 200);
  }

  @test
  ajax() {
    Controller.setEndpoint("http://localhost:18080");
    testController.launchAction();
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
