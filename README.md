# redux-lz-controller

Regrouping action and reducer into a controller

## Installation

```bash
yarn add redux-lz-controller
npm install redux-lz-controller
```

## Usage

This example shows how to integrate in React

### index.js

```javascript
...
// Import our controller and Redux
import { Controller } from "redux-lz-controller";
import * as ReduxThunk from "redux-thunk";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import * as Redux from "redux";
import { Provider } from "react-redux";
//

// Initialization of all our app controllers
import ContactsController from "./controllers/ContactsController";
new ContactsController();
//

const persistConfig = {
  key: "root",
  storage: storage,
  blacklist: ["notifications"]
};

// Retrieve our global reducers
let rootReducer = Controller.getReducers();
//
rootReducer = persistReducer(persistConfig, rootReducer);

let store = Redux.createStore(rootReducer, Redux.compose(Redux.applyMiddleware(ReduxThunk.default)));
// Add store to controller
Controller.setStore(store);

// Now render your application
```

### ContactsController.ts

```javascript
import { Controller } from "redux-lz-controller";

// Extends library controller
class ContactsController extends Controller {
  constructor() {
    // This controller manage the subtree "contacts" of global Redux state
    super("contacts", { contactsList: [] }); // its default value is an empty array
  }

  // We expose a method to add a contact
  addContact(newContact: any, callback: any) {
    // We simulate an asynchronous action
    this.asyncAction(
      /*
      The name of the Event
      
      It will generate a ADD_CONTACT event first
      Execute the content of the method asynchronously
      Then if success a ADD_CONTACT_SUCCESS
      Or if promise reject a ADD_CONTACT_FAILED
      */
      "ADD_CONTACT",
      async (dispatch: any, getState: any) => {
        let contacts = [...this.getLocalState().contactsList];
        // Here we should use the ajax method
        return { contactsList: [...contacts, newContact] };
      },
      // A Post action callback if UI need to update its local state
      callback
    );
  }
}

export default ContactsController;
```

Depending on the size of your application, we recommend grouping the different controllers in a single folder (here: /controllers )

### In your App or Component

```javascript
...
import React, { useState } from "react";
import { Controller } from "redux-lz-controller";
import { useSelector } from "react-redux";
// other imports depending on your own cooking
...

const App = () => {

  const classes = useStyles();
  const [current, setCurrent] = useState({ name: "", email: "" })

  const async = useSelector(state => state.contacts._async.ADD_CONTACT || {});
  const contactsList = useSelector(state => state.contacts.contactsList);

  const handleChange = (e, { name, value }) => {
    setCurrent({ ...current, [name]: value })
  };

  const handleSubmit = () => {
    Controller.get("contacts").addContact(current, () => {
      // Add here your callback logic 
      // in this specific example we want the current state to be cleared after contact has been added
      setCurrent({ name: "", email: "" });
    });
  };

  return (
    <div className={classes.app}>
      <header>
        <p>Redux Loopingz Controller integration for React</p>
      </header>
      <Form onSubmit={handleSubmit}>
        <Form.Group>
          <Form.Input
            placeholder="Name"
            name="name"
            value={current.name}
            onChange={handleChange}
          />
          <Form.Input
            placeholder="Email"
            name="email"
            value={current.email}
            onChange={handleChange}
          />
          <Form.Button content="Submit" />
        </Form.Group>
      </Form>
    </div>
  );
}

export default App;
```