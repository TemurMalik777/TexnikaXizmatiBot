import { Module } from "@nestjs/common";
import { BotsService } from "./bots.service";
import { SequelizeModule } from "@nestjs/sequelize";
import { Bot } from "./models/bot.model";
import { Customer } from "./models/customer.model";
import { BotsUpdate } from "./bot.update";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [SequelizeModule.forFeature([Bot, Customer])],
  providers: [BotsService, BotsUpdate],
  exports: [BotsService],
})
export class BotsModule {}
