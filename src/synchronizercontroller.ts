import { Controller } from "./controller";

export class SynchronizerAction {
  params: any;
  id: string;
  type: string;
  controller: string;
  mergeMode: string;

  constructor(controller: Controller, type: string, id: string, params: any, mergeMode: string = "extend") {
    this.params = params;
    this.id = id;
    this.type = type;
    this.controller = controller.getId();
    this.mergeMode = mergeMode;
  }

  getUuid() {
    return this.controller + "/" + this.type + "/" + this.id;
  }

  merge(action) {
    if (!action) {
      return this;
    }
    if (this.mergeMode === "extend") {
      this.params = { ...action.params, ...this.params };
    } else if (this.mergeMode === "concat") {
      this.params = action.params.concat(this.params);
    }
    return this;
  }

  export() {
    return {
      params: this.params,
      id: this.id,
      type: this.type,
      controller: this.controller,
      uuid: this.getUuid(),
    };
  }
}
