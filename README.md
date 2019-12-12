# redux-controller

Regrouping action and reducer into a controller

# installation

```bash
yarn add redux-lz-controller
npm install redux-lz-controller
```

# usage

This example shows how to integrate in React

## index.js

```javascript
import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import * as serviceWorker from "./serviceWorker";

// import dependencies
import Controller from "redux-lz-controller";
import * as ReduxThunk from "redux-thunk";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import * as Redux from "redux";
import { Provider } from "react-redux";
//

import ContactsController from "./controllers/ContactsController";
new ContactsController();

const persistConfig = {
  key: "root",
  storage: storage,
  blacklist: ["notifications"]
};
let rootReducer = Controller.getReducers();
rootReducer = persistReducer(persistConfig, rootReducer);

let composed;
window.__MUI_USE_NEXT_TYPOGRAPHY_VARIANTS__ = true;
if (window.__REDUX_DEVTOOLS_EXTENSION__) {
  composed = Redux.compose(
    Redux.applyMiddleware(ReduxThunk.default),
    window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
  );
} else {
  composed = Redux.compose(Redux.applyMiddleware(ReduxThunk.default));
}

let store = Redux.createStore(rootReducer, composed);
Controller.setStore(store);

ReactDOM.render(
  <Provider store={Controller.getStore()}>
    <App />
  </Provider>,
  document.getElementById("root")
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
```

Depending on the size of your application, we recommend grouping the different controllers in a single folder (here: /controllers )

## ContactsController.ts

```javascript
import Controller from "redux-lz-controller";
class ContactsController extends Controller {
  constructor() {
    super("contacts", { contactsList: array });
  }

  addContact(newContact: any, callback: any) {
    this.asyncAction(
      "ADD_CONTACT",
      async (dispatch: any, getState: any) => {
        let contacts = [...this.getLocalState().contactsList];
        return { contactsList: [...contacts, newContact] };
      },
      () => {
        if (callback) {
          callback();
        }
      }
    );
  }
}

export default ContactsController;
```

## In your App or Component

```javascript
import React from "react";
import logo from "./logo.svg";
import connect from "react-redux/es/connect/connect";

import Controller from "redux-lz-controller";

import { withStyles } from "@material-ui/core/styles";
import { Form } from "semantic-ui-react";

const styles = theme => ({
  app: {
    textAlign: "center",
    minHeight: "100vh"
  },
  logo: {
    height: "40vmin",
    pointerEvents: "none"
  },
  root: {
    color: "white",
    "& > *": {
      margin: theme.spacing(1)
    }
  }
});

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      name: "",
      email: ""
    };
  }
  state = {};

  handleChange = (e, { name, value }) => this.setState({ [name]: value });

  handleSubmit = () => {
    const { name, email } = this.state;

    Controller.get("contacts").addContact(this.state, () => {
      console.log("contact added:", name, email);
      this.setState({ name: "", email: "" });
    });
  };
  render() {
    const { classes, contactsList } = this.props;
    const { name, email } = this.state;
    console.log(contactsList);
    return (
      <div className={classes.app}>
        <header>
          <a href="http://wwww.loopingz.com" target="_blank" rel="noopener noreferrer">
            <img src={logo} className={classes.logo} alt="logo" />
          </a>

          <p>Redux Loopingz Controller</p>
        </header>
        <Form onSubmit={this.handleSubmit}>
          <Form.Group>
            <Form.Input placeholder="Name" name="name" value={name} onChange={this.handleChange} />
            <Form.Input placeholder="Email" name="email" value={email} onChange={this.handleChange} />
            <Form.Button content="Submit" />
          </Form.Group>
        </Form>
      </div>
    );
  }
}

export default withStyles(styles)(
  connect((state, ownProps) => {
    return {
      async: state.contacts._async.ADD_CONTACT || {},
      contactsList: state.contacts.contactsList
    };
  })(App)
);
```
