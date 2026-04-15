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
  }, [location.pathname]);

  return null;
};
