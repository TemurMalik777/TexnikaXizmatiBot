import {
  Action,
  Command,
  Ctx,
  Hears,
  On,
  Start,
  Update,
} from "nestjs-telegraf";
import { Context, Markup } from "telegraf";
import { BotsService } from "./bots.service";

@Update()
export class BotUpdate {
  constructor(private readonly botService: BotsService) {}

  @Start()
  async onStart(@Ctx() ctx: Context) {
    console.log("Start command received");
    console.log("Context:", {
      from: ctx.from,
      chat: ctx.chat,
      message: ctx.message,
    });

    try {
      return await this.botService.start(ctx);
    } catch (error) {
      console.error("Error in start command:", error);
      await ctx.reply("Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.");
    }
  }

  @On("contact")
  async onContact(@Ctx() ctx: Context) {
    return this.botService.onContact(ctx);
  }

  @Command("stop")
  async onStop(@Ctx() ctx: Context) {
    return this.botService.onStop(ctx);
  }

  @On("text")
  async onText(@Ctx() ctx: Context) {
    return this.botService.onText(ctx);
  }

  @On("message")
  async onMessage(@Ctx() ctx: Context) {
    console.log(ctx.botInfo);
    console.log(ctx.chat);
    console.log(ctx.chat!.id);
    console.log(ctx.from);
    console.log(ctx.from!.id);
  }
}
