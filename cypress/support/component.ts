import "cypress-watch-and-reload/support";
import { mount } from "./lit";

Cypress.Commands.add("mount", mount);
