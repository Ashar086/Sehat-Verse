import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import * as LangChain from "langchain";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  // LangChain snippet for NotFound page (no-op example)
  useEffect(() => {
    try {
      const lc = (LangChain as any);
      console.log("LangChain on NotFound", lc?.version || "no-version");
    } catch (err) {
      console.warn("LangChain init error (notfound)", err);
    }
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
