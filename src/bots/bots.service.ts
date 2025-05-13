import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Bot } from "./models/bot.model";
import { Context, Markup, Telegraf } from "telegraf";
import { InjectBot } from "nestjs-telegraf";
import { BOT_NAME } from "../app.constants";

@Injectable()
export class BotsService {
  constructor(
    @InjectModel(Bot) private readonly botModule: typeof Bot,
    @InjectBot(BOT_NAME) private readonly bot: Telegraf<Context>
  ) {}

  async start(ctx: Context) {
    try {
      console.log("Starting bot service start method");

      const user_id = ctx.from?.id;
      if (!user_id) {
        console.error("User ID not found in context");
        throw new BadRequestException("Foydalanuvchi ID si topilmadi");
      }

      console.log("Looking for user with ID:", user_id);
      const user = await this.botModule.findByPk(user_id);

      if (!user) {
        console.log("Creating new user");
        const newUser = await this.botModule.create({
          userId: user_id,
          username: ctx.from?.username!,
          first_name: ctx.from?.first_name,
          last_name: ctx.from?.last_name!,
          lang: ctx.from?.language_code!,
        });
        console.log("New user created:", newUser.toJSON());

        return await ctx.replyWithHTML(
          `Assalomu alaykum, <b>${newUser.first_name}</b>!\n\nIltimos, <b>Telefon raqamni yuborish</b> tugmasini bosing`,
          {
            ...Markup.keyboard([
              [Markup.button.contactRequest("Telefon raqamni yuborish")],
            ])
              .oneTime()
              .resize(),
          }
        );
      }

      if (!user.status || !user.phone_number) {
        console.log("User exists but needs phone number");
        return await ctx.replyWithHTML(
          `Assalomu alaykum, <b>${user.first_name}</b>!\n\nIltimos, <b>Telefon raqamni yuborish</b> tugmasini bosing`,
          {
            ...Markup.keyboard([
              [Markup.button.contactRequest("Telefon raqamni yuborish")],
            ])
              .oneTime()
              .resize(),
          }
        );
      }

      console.log("User already registered, sending welcome message");
      const mainMenuKeyboard = Markup.keyboard([
        ["📱 Katalog", "🛒 Buyurtma berish"],
        ["🔧 Texnik xizmat", "☎️ Bog'lanish"],
      ]).resize();

      return await ctx.replyWithHTML(
        `Assalomu alaykum, <b>${user.first_name}</b>! 👋\n\nMaishiy texnika botimizga xush kelibsiz!\n\nQuyidagi bo'limlardan birini tanlang:`,
        mainMenuKeyboard
      );
    } catch (error) {
      console.error("Error in start method:", error);
      throw new BadRequestException(error.message || "Xatolik yuz berdi");
    }
  }

  async onContact(ctx: Context) {
    try {
      const user_id = ctx.from?.id;
      const user = await this.botModule.findByPk(user_id);
      if (!user) {
        await ctx.replyWithHTML(`Iltimos , <b>start</b> tugmasini bosing`, {
          ...Markup.keyboard([["/start"]])
            .oneTime()
            .resize(),
        });
      } else if (user.phone_number) {
        await ctx.replyWithHTML("Siz avval ro'yxatdan o'tgansiz", {
          ...Markup.removeKeyboard(),
        });
      } else if (
        "contact" in ctx.message! &&
        ctx.message?.contact.user_id != user_id
      ) {
        await ctx.reply(
          `Iltimos, o'zinggizni telefo'n raqaminggizni yuboring`,
          {
            ...Markup.keyboard([
              [Markup.button.contactRequest("Telefo'n raqamni yuborish")],
            ])
              .oneTime()
              .resize(),
          }
        );
      } else if ("contact" in ctx.message!) {
        let phone = ctx.message.contact.phone_number;
        if (phone[0] != "+") {
          phone = "+" + phone;
        }
        user.phone_number = phone;
        user.status = true;
        await user.save();
        await ctx.reply("Telefon raqamingiz muvaffaqiyatli saqlandi ✅", {
          ...Markup.removeKeyboard(),
        });
      }
    } catch (error) {
      console.log(`Error on Contact: ${error}`);
      throw new BadRequestException(error);
    }
  }

  async onStop(ctx: Context) {
    try {
      const user_id = ctx.from?.id;
      const user = await this.botModule.findByPk(user_id);
      if (!user) {
        await ctx.replyWithHTML(`Iltimos , <b>start</b> tugmasini bosing`, {
          ...Markup.keyboard([["/start"]])
            .oneTime()
            .resize(),
        });
      } else if (user.status) {
        user.status = false;
        user.phone_number = "";
        await user.save();
        await ctx.replyWithHTML(
          `Siz vaqtincha botdan chiqdingiz. Qayta faollashtirish uchun <b>/start</b> tugmasini bosing.`,
          {
            ...Markup.keyboard([["/start"]])
              .oneTime()
              .resize(),
          }
        );
      }
    } catch (error) {
      console.log(`Error on stop:`, error);
    }
  }

  async onText(ctx: Context) {
    if ("text" in ctx.message!) {
      try {
        const userId = ctx.from?.id;
        const user = await this.botModule.findByPk(userId);
        if (!user) {
          await ctx.replyWithHTML(`Iltimos , <b>start</b> tugmasini bosing`, {
            ...Markup.keyboard([["/start"]])
              .oneTime()
              .resize(),
          });
        } else {
          //===================ADDRESS=========================
          // const address = await this.addressMode.findOne({
          //   where: {
          //     userId,
          //     last_state: { [Op.ne]: "finish" },
          //   },
          //   order: [["id", "DESC"]],
          // });
          // if (address) {
          //   const userInput = ctx.message.text;
          //   switch (address.last_state) {
          //     case "name":
          //       address.name = userInput;
          //       address.last_state = "address";
          //       await address.save();
          //       await ctx.reply("Manzilingizni kiriting:", {
          //         parse_mode: "HTML",
          //         ...Markup.removeKeyboard(),
          //       });
          //       break;
          //     case "address":
          //       address.address = userInput;
          //       address.last_state = "location";
          //       await address.save();
          //       await ctx.reply("Manzilingizni lokatsiyasinim yuboring:", {
          //         parse_mode: "HTML",
          //         ...Markup.keyboard([
          //           [Markup.button.locationRequest("Lokatsiyani yuboring")],
          //         ]).resize(),
          //       });
          //       break;
          //   }
          // }
          //=======================CAR============================
          // const car = await this.carModel.findByPk(userId);
        }
      } catch (error) {
        console.log(`Error on text`, error);
      }
    }
  }
}
