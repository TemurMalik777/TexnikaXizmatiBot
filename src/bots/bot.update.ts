import { Action, Command, On, Start, Update } from "nestjs-telegraf";
import { Context, Markup, Telegraf } from "telegraf";
import { BotsService } from "./bots.service";
import { InjectBot } from "nestjs-telegraf";
import { BOT_NAME } from "../app.constants";

@Update()
export class BotsUpdate {
  private readonly specializations = {
    spec_barber: "barber",
    spec_plumber: "plumber",
    spec_repairman: "repairman",
    spec_electrician: "electrician",
    spec_carpenter: "carpenter",
  };

  constructor(
    private readonly botsService: BotsService,
    @InjectBot(BOT_NAME) private readonly bot: Telegraf<Context>
  ) {}

  @Start()
  async onStart(ctx: Context) {
    try {
      const userId = ctx.from?.id;
      const username = ctx.from?.username;
      const first_name = ctx.from?.first_name;
      const last_name = ctx.from?.last_name;

      if (!userId) {
        await ctx.reply("Foydalanuvchi topilmadi!");
        return;
      }

      await this.botsService.registerUser(
        userId,
        username,
        first_name,
        last_name
      );

      await ctx.reply("Assalomu alaykum! Botimizga xush kelibsiz.", {
        ...Markup.keyboard([["📝 Ro'yxatdan o'tish"]])
          .oneTime()
          .resize(),
      });
    } catch (error) {
      console.error("Error in start command:", error);
      await ctx.reply(
        "Xatolik yuz berdi. Iltimos, qaytadan /start buyrug'ini bosing."
      );
    }
  }

  @Action(/^spec_/)
  async onSpecialization(ctx: Context) {
    try {
      const userId = ctx.from?.id;
      if (!userId) return;

      const callback = ctx.callbackQuery;
      if (!callback || !("data" in callback)) return;

      const specialization = callback.data;
      const userData = this.botsService.getRegistrationData(userId) || {};
      userData.specialization = specialization;
      userData.step = "full_name";
      this.botsService.setRegistrationData(userId, userData);

      await ctx.editMessageText(
        "Mutaxassisligingiz saqlandi ✅\n\nEndi to'liq ismingizni kiriting (Masalan: Abdullayev Abdulla)",
        {
          reply_markup: undefined,
        }
      );
    } catch (error) {
      console.error("Error in specialization callback:", error);
      await ctx.reply(
        "Xatolik yuz berdi. Iltimos, qaytadan /start buyrug'ini bosing."
      );
    }
  }

  @On("text")
  async onText(ctx: Context) {
    try {
      if ("text" in ctx.message!) {
        const userId = ctx.from?.id;
        if (!userId) return;

        const messageText = ctx.message.text;

        if (messageText === "📝 Ro'yxatdan o'tish") {
          await ctx.reply("Iltimos, ro'yxatdan o'tish turini tanlang:", {
            ...Markup.keyboard([["👨‍🔧 USTA", "👤 MIJOZ"]])
              .oneTime()
              .resize(),
          });
          return;
        }

        await this.botsService.handleTextMessage(ctx, userId, messageText);
      }
    } catch (error) {
      console.error("Error in text handler:", error);
      await ctx.reply(
        "Xatolik yuz berdi. Iltimos, qaytadan /start buyrug'ini bosing."
      );
    }
  }

  @On("contact")
  async onContact(ctx: Context) {
    try {
      console.log("onContact started");
      const userId = ctx.from?.id;
      if (!userId) {
        console.log("No userId found");
        await ctx.reply(
          "Foydalanuvchi ID si topilmadi. Iltimos, qaytadan /start buyrug'ini bosing"
        );
        return;
      }

      if ("contact" in ctx.message! && ctx.message?.contact.user_id != userId) {
        console.log("Invalid contact - not user's own contact");
        await ctx.reply(`Iltimos, o'zingizning telefon raqamingizni yuboring`, {
          ...Markup.keyboard([
            [Markup.button.contactRequest("📱 Telefon raqamni yuborish")],
          ])
            .oneTime()
            .resize(),
        });
        return;
      }

      if ("contact" in ctx.message!) {
        await this.botsService.handleContact(ctx, userId);
      }
    } catch (error) {
      console.error("Error in contact handler:", error);
      await ctx.reply(
        "Xatolik yuz berdi. Iltimos, qaytadan /start buyrug'ini bosing."
      );
    }
  }

  @On("location")
  async onLocation(ctx: Context) {
    try {
      const userId = ctx.from?.id;
      if (!userId) return;

      if ("location" in ctx.message!) {
        const location = ctx.message.location;
        await this.botsService.handleLocation(ctx, userId, location);
      }
    } catch (error) {
      console.error("Error in location handler:", error);
      await ctx.reply(
        "Xatolik yuz berdi. Iltimos, qaytadan /start buyrug'ini bosing."
      );
    }
  }

  @Action(/^approve_/)
  async onApprove(ctx: Context) {
    try {
      if (!ctx.callbackQuery || !("data" in ctx.callbackQuery)) return;

      const userId = parseInt(ctx.callbackQuery.data.split("_")[1]);
      const userState = await this.botsService.getUserState(userId);

      if (!userState) {
        await ctx.reply("Foydalanuvchi ma'lumotlari topilmadi.");
        return;
      }

      // Customer yaratish
      await this.botsService.createCustomer(userId, userState);

      // Adminga xabar
      await ctx.editMessageText("Usta muvaffaqiyatli tasdiqlandi ✅");

      // Ustaga xabar
      await this.botsService.sendMessage(
        userId,
        "Tabriklaymiz! Siz muvaffaqiyatli ro'yxatdan o'tdingiz! ✅\n\nBuyurtmalar tez orada sizga yuboriladi.",
        { ...Markup.removeKeyboard() }
      );
    } catch (error) {
      console.error("Error in approve handler:", error);
      await ctx.reply("Xatolik yuz berdi.");
    }
  }

  @Action(/^reject_/)
  async onReject(ctx: Context) {
    try {
      if (!ctx.callbackQuery || !("data" in ctx.callbackQuery)) return;

      const userId = parseInt(ctx.callbackQuery.data.split("_")[1]);

      // Adminga xabar
      await ctx.editMessageText("Usta rad etildi ❌");

      // Ustaga xabar
      await this.botsService.sendMessage(
        userId,
        "Kechirasiz, sizning so'rovingiz rad etildi. Qaytadan urinib ko'rish uchun /start buyrug'ini bosing.",
        { ...Markup.removeKeyboard() }
      );

      // User state ni tozalash
      await this.botsService.clearUserState(userId);
    } catch (error) {
      console.error("Error in reject handler:", error);
      await ctx.reply("Xatolik yuz berdi.");
    }
  }

  @Action(/^contact_admin_/)
  async onContactAdmin(ctx: Context) {
    try {
      if (!ctx.callbackQuery || !("data" in ctx.callbackQuery)) return;

      const userId = parseInt(ctx.callbackQuery.data.split("_")[2]);

      // Ustaga admin kontaktini yuborish
      await this.botsService.sendMessage(
        userId,
        "Admin bilan bog'lanish uchun: @SalimovDavlat01"
      );

      await ctx.answerCbQuery("Ustaga admin kontakti yuborildi");
    } catch (error) {
      console.error("Error in contact admin handler:", error);
      await ctx.reply("Xatolik yuz berdi.");
    }
  }
}
