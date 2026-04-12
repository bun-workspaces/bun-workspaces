Bun.serve({
  port: 8080,
  fetch: () => {
    return new Response("Hello, world!");
  },
});
