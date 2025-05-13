import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { BadRequestException, ValidationPipe } from "@nestjs/common";
// import { Logger } from "@nestjs/common";

async function start() {
  try {
    // Logger.overrideLogger(true); //false
    const PORT = process.env.PORT || 3030;
    const app = await NestFactory.create(AppModule); // {logger: ["debug", "error"]}
    app.setGlobalPrefix("api");
    await app.listen(PORT, () => {
      console.log(`Server started at: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.log(error);
  }
}
start();
