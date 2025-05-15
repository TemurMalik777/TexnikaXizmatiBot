import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Bot } from "./models/bot.model";
import { Context, Markup, Telegraf } from "telegraf";
import { InjectBot } from "nestjs-telegraf";
import { BOT_NAME } from "../app.constants";
import { Customer } from "./models/customer.model";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class BotsService {
  private readonly admins: string[];
  private readonly primaryAdmin: string;
  private registrationData: Map<number, any> = new Map();

  private readonly specializations = {
    spec_barber: "💇‍♂️ Sartarosh",
    spec_plumber: "🔧 Santexnik",
    spec_repairman: "🛠 Ta'mirchi",
    spec_electrician: "⚡️ Elektrik",
    spec_carpenter: "🪚 Duradgor",
  };

  constructor(
    @InjectModel(Bot) private readonly botModel: typeof Bot,
    @InjectModel(Customer) private readonly customerModel: typeof Customer,
    @InjectBot(BOT_NAME) private readonly bot: Telegraf<Context>,
    private readonly configService: ConfigService
  ) {
    this.admins = this.configService.get<string[]>("admin.admins") || [];
    this.primaryAdmin =
      this.configService.get<string>("admin.primaryAdmin") || "";
  }

  async registerUser(
    userId: number,
    username?: string,
    first_name?: string,
    last_name?: string
  ) {
    const [user] = await this.botModel.findOrCreate({
      where: { userId },
      defaults: {
        userId,
        username: username || "",
        first_name: first_name || "",
        last_name: last_name || "",
        lang: "uz",
      },
    });
    return user;
  }

  async handleSpecialization(userId: number, specialization: string) {
    console.log("Handling specialization for user:", userId);
    const user = await this.botModel.findByPk(userId);
    if (user) {
      user.specialization = specialization;
      await user.save();
      await this.bot.telegram.sendMessage(
        userId,
        "Iltimos, to'liq ismingizni kiriting (Familiya Ism):"
      );
    }
  }

  async handleTextMessage(ctx: Context, userId: number, messageText: string) {
    const user = await this.botModel.findByPk(userId);
    if (!user) {
      await ctx.reply(
        "Foydalanuvchi topilmadi. Iltimos, /start buyrug'ini bosing"
      );
      return;
    }

    let userData = this.registrationData.get(userId) || {};

    switch (messageText) {
      case "👨‍🔧 USTA":
        user.role = "master";
        await user.save();
        userData.step = "specialization";
        this.registrationData.set(userId, userData);
        await ctx.reply("Mutaxassisligingizni tanlang:", {
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback("💇‍♂️ Sartarosh", "spec_barber"),
              Markup.button.callback("🔧 Santexnik", "spec_plumber"),
            ],
            [
              Markup.button.callback("🛠 Ta'mirchi", "spec_repairman"),
              Markup.button.callback("⚡️ Elektrik", "spec_electrician"),
            ],
            [Markup.button.callback("🪚 Duradgor", "spec_carpenter")],
          ]),
        });
        break;

      default:
        if (userData.step === "full_name") {
          const nameParts = messageText.split(" ");
          if (nameParts.length < 2) {
            await ctx.reply(
              "Iltimos, to'liq ismingizni kiriting (Familiya Ism):"
            );
            return;
          }
          userData.last_name = nameParts[0];
          userData.first_name = nameParts.slice(1).join(" ");
          userData.step = "phone";
          this.registrationData.set(userId, userData);
          await ctx.reply("Telefon raqamingizni yuboring:", {
            ...Markup.keyboard([
              [Markup.button.contactRequest("📱 Telefon raqamni yuborish")],
            ])
              .oneTime()
              .resize(),
          });
        } else if (userData.step === "workshop") {
          userData.workshop_name = messageText;
          userData.step = "address";
          this.registrationData.set(userId, userData);
          await ctx.reply("Manzilingizni kiriting (Majburiy emas):");
        } else if (userData.step === "address") {
          userData.address = messageText;
          userData.step = "work_address";
          this.registrationData.set(userId, userData);
          await ctx.reply("Mo'ljalni kiriting (Majburiy emas):");
        } else if (userData.step === "work_address") {
          userData.work_address = messageText;
          userData.step = "location";
          this.registrationData.set(userId, userData);
          await ctx.reply("Joylashuvingizni yuboring:", {
            ...Markup.keyboard([
              [Markup.button.locationRequest("📍 Joylashuvni yuborish")],
            ])
              .oneTime()
              .resize(),
          });
        } else if (userData.step === "work_time") {
          userData.work_start_time = messageText;
          userData.step = "work_end_time";
          this.registrationData.set(userId, userData);
          await ctx.reply("Ish yakunlash vaqtini kiriting (Masalan: 18.00):");
        } else if (userData.step === "work_end_time") {
          userData.work_end_time = messageText;
          userData.step = "service_time";
          this.registrationData.set(userId, userData);
          await ctx.reply(
            "Har bir mijoz uchun o'rtacha sarflanadigan vaqt (min):"
          );
        } else if (userData.step === "service_time") {
          userData.service_time = parseInt(messageText);
          userData.step = "confirmation";
          this.registrationData.set(userId, userData);

          const confirmationMessage = `So'ngra ustaning ma'lumotlari ketma-ket so'rab olindi:
1. Ismi - ${userData.first_name}
2. Telefon raqami - ${userData.phone_number}
3. Ustaxona nomi - ${userData.workshop_name || "(Kiritilmadi)"}
4. Manzili - ${userData.address || "(Kiritilmadi)"}
5. Mo'ljal - ${userData.work_address || "(Kiritilmadi)"}
6. Lokatsiyasi - ✅
7. Ishni boshlash vaqti - ${userData.work_start_time}
8. Ishni yakunlash vaqti - ${userData.work_end_time}
9. Har bir mijoz uchun o'rtacha sarflanadigan vaqt (min) - ${userData.service_time}`;

          await ctx.reply(confirmationMessage, {
            ...Markup.keyboard([
              [
                Markup.button.text("✅ Tasdiqlash"),
                Markup.button.text("❌ Bekor qilish"),
              ],
            ])
              .oneTime()
              .resize(),
          });
        } else if (userData.step === "confirmation") {
          if (messageText === "✅ Tasdiqlash") {
            await this.sendToAdmin(userId, userData);
            await ctx.reply(
              "Ma'lumotlaringiz adminga yuborildi. Iltimos, tasdiqlashni kuting.",
              {
                ...Markup.removeKeyboard(),
              }
            );
          } else if (messageText === "❌ Bekor qilish") {
            this.registrationData.delete(userId);
            await ctx.reply(
              "Ro'yxatdan o'tish bekor qilindi. Qaytadan boshlash uchun /start buyrug'ini bosing.",
              {
                ...Markup.removeKeyboard(),
              }
            );
          }
        }
    }
  }

  async handleClientRegistration(ctx: Context, user: Bot) {
    user.status = true;
    user.role = "client";
    await user.save();
    await ctx.replyWithHTML(`Iltimos, telefon raqamingizni yuboring:`, {
      ...Markup.keyboard([
        [Markup.button.contactRequest("📱 Telefon raqamni yuborish")],
      ])
        .oneTime()
        .resize(),
    });
  }

  async handleContact(ctx: Context, userId: number) {
    if ("contact" in ctx.message!) {
      const userData = this.registrationData.get(userId);
      if (!userData) return;

      let phone = ctx.message.contact.phone_number;
      if (!phone.startsWith("+")) {
        phone = "+" + phone;
      }

      userData.phone_number = phone;
      userData.step = "workshop";
      this.registrationData.set(userId, userData);

      await ctx.reply("Ustaxona nomini kiriting (Majburiy emas):", {
        ...Markup.removeKeyboard(),
      });
    }
  }

  async handleLocation(
    ctx: Context,
    userId: number,
    location: { latitude: number; longitude: number }
  ) {
    const userData = this.registrationData.get(userId);
    if (!userData) return;

    userData.location = location;
    userData.step = "work_time";
    this.registrationData.set(userId, userData);

    await ctx.reply("Ish boshlash vaqtini kiriting (Masalan: 9.00):", {
      ...Markup.removeKeyboard(),
    });
  }

  async createCustomer(userId: number, data: any) {
    try {
      const customer = await this.customerModel.create({
        user_id: userId,
        first_name: data.first_name,
        last_name: data.last_name,
        phone_number: data.phone_number,
        role: "master",
        specialization: data.specialization,
        workshop_name: data.workshop_name,
        address: data.address,
        work_address: data.work_address,
        location: data.location,
        work_start_time: data.work_start_time,
        work_end_time: data.work_end_time,
        service_time: data.service_time,
        is_active: true,
      });

      // Registration data ni tozalash
      this.registrationData.delete(userId);

      return customer;
    } catch (error) {
      console.error("Error creating customer:", error);
      throw error;
    }
  }

  async getUserState(userId: number) {
    return null;
  }

  async sendMessage(userId: number, message: string, options?: any) {
    return await this.bot.telegram.sendMessage(userId, message, options);
  }

  async clearUserState(userId: number) {
    return;
  }

  getRegistrationData(userId: number) {
    return this.registrationData.get(userId);
  }

  setRegistrationData(userId: number, data: any) {
    this.registrationData.set(userId, data);
  }

  async sendToAdmin(userId: number, userData: any) {
    const adminMessage = `Yangi usta ro'yxatdan o'tdi! ✅\n
👤 Ism: ${userData.first_name}
👨‍👦‍👦 Familiya: ${userData.last_name}
📱 Telefon: ${userData.phone_number}
🛠 Mutaxassislik: ${userData.specialization}
🏪 Ustaxona: ${userData.workshop_name || "Ko'rsatilmagan"}
📍 Manzil: ${userData.address || "Ko'rsatilmagan"}
📍 Mo'ljal: ${userData.work_address || "Ko'rsatilmagan"}
⏰ Ish vaqti: ${userData.work_start_time} - ${userData.work_end_time}
⏱ Xizmat vaqti: ${userData.service_time} daqiqa`;

    await this.bot.telegram.sendMessage(this.primaryAdmin, adminMessage, {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback("✅ Tekshirish", `approve_${userId}`),
          Markup.button.callback("❌ Bekor qilish", `reject_${userId}`),
        ],
        [
          Markup.button.callback(
            "👤 Admin bilan bog'lanish",
            `contact_admin_${userId}`
          ),
        ],
      ]),
    });
  }
}
