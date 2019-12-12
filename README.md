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

### ContactsController.ts

```javascript
import Controller from "redux-lz-controller";

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

```javascript
...
// Import our controller and Redux
import Controller from "redux-lz-controller";
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

Depending on the size of your application, we recommend grouping the different controllers in a single folder (here: /controllers )

### In your App or Component

```javascript
...
import Controller from "redux-lz-controller";
...

class App extends React.Component {
  ...
  handleSubmit = () => {
    const { name, email } = this.state;
    // Retrieve a Controller and addContact
    Controller.get("contacts").addContact(this.state, () => {
      // Reset component after successful action
      this.setState({ name: "", email: "" });
    });
  };

  render() {
    const { classes, contactsList } = this.props;
    const { name, email } = this.state;
    return (
      <Form onSubmit={this.handleSubmit}>
        <Form.Group>
          <Form.Input placeholder="Name" name="name" value={name} onChange={this.handleChange} />
          <Form.Input placeholder="Email" name="email" value={email} onChange={this.handleChange} />
          <Form.Button content="Submit" />
        </Form.Group>
      </Form>
    );
  }
}

export default withStyles(styles)(
  connect((state, ownProps) => {
    return {
      // Retrieve the async state of the action
      async: state.contacts._async.ADD_CONTACT || {},
      contactsList: state.contacts.contactsList
    };
  })(App)
);
```
