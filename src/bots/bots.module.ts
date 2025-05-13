import { Module } from "@nestjs/common";
import { BotsService } from "./bots.service";
import { SequelizeModule } from "@nestjs/sequelize";
import { Bot } from "./models/bot.model";
import { BotUpdate } from "./bot.update";

@Module({
  imports: [SequelizeModule.forFeature([Bot])],
  controllers: [],
  providers: [BotsService, BotUpdate],
  exports: [BotsService, BotUpdate],
})
export class BotsModule {}
