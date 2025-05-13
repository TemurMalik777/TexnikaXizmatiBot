import { Module } from "@nestjs/common";
import { BotsModule } from "./bots/bots.module";
import { TelegrafModule } from "nestjs-telegraf";
import { BOT_NAME } from "./app.constants";
import { ConfigModule } from "@nestjs/config";
import { SequelizeModule } from "@nestjs/sequelize";

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: ".env", isGlobal: true }),
    BotsModule,
    TelegrafModule.forRootAsync({
      botName: BOT_NAME,
      useFactory: () => {
        if (!process.env.BOT_TOKEN) {
          throw new Error("BOT_TOKEN must be defined in .env file");
        }
        return {
          token: process.env.BOT_TOKEN,
          middlewares: [], 
        };
      },
    }),

    SequelizeModule.forRoot({
      dialect: "postgres",
      host: process.env.PG_HOST,
      port: Number(process.env.PG_PORT),
      username: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DB,
      models: [],
      autoLoadModels: true,
      sync: { alter: true },
      logging: false,
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
