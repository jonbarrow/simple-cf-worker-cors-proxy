import { join } from "path";

//https://nitro.unjs.io/config
export default defineNitroConfig({
  noPublicDir: true,
  srcDir: "./src",
  alias: {
    "@": join(__dirname, "src")
  }
});
