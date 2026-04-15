import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export const NormalizeIndex = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === "/index") {
      navigate("/" + (location.search ?? "") + (location.hash ?? ""), {
        replace: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return null;
};
