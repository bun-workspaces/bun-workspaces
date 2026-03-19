import { demoProject } from "bw-web-service-shared";
import { useEffect } from "react";
import { useApiHealth, useLoadApiHealth } from "../service/apiHealth";
import {
  useInvokeWebCli,
  useInvokeWebCliResult,
} from "../service/invokeWebCli";

export const WebCliPage = () => {
  useLoadApiHealth();

  const { isLoading, isHealthy, error } = useApiHealth();

  const { invokeWebCli } = useInvokeWebCli();

  const result = useInvokeWebCliResult();

  useEffect(() => {
    if (isHealthy) {
      invokeWebCli({
        argv: ["list-workspaces", "--json"],
        terminalWidth: 80,
      });
    }
  }, [isHealthy]);

  useEffect(() => {
    console.log(result);
    console.log(demoProject);
  }, [result]);

  return <div>WebCliPage</div>;
};
