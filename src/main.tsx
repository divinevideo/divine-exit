import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/inter";
import { IconContext } from "@phosphor-icons/react";
import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <IconContext.Provider value={{ weight: "bold", size: 20 }}>
      <App />
    </IconContext.Provider>
  </React.StrictMode>
);
