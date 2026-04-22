import { useContext } from "react";
import { MockDataContext } from "./MockDataContext";

export const useMockData = () => useContext(MockDataContext);
