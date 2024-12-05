import { Bot, InlineKeyboard, InputFile } from "grammy";
import axios from "axios"
import express, { NextFunction, Request, Response } from "express"
import { convertWhatsAppToVCard } from "./helper";

const app = express()

const accessToken = process.env.ACCESS_TOKEN_WA || "";
const clientChatID = process.env.CLIENT_CHAT_ID || "";


app.use(express.json());
app.get('/', (req, res) => { res.send("Server is running...") })


app.get("/getMessage", (req, res) => {
  const verify_token = "vmmoorthy";

  // Parse params from the webhook verification request
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  // Check if a token and mode were sent
  if (mode && token) {
    // Check the mode and token sent are correct
    if (mode === "subscribe" && token === verify_token) {
      // Respond with 200 OK and challenge token from the request
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
})


app.post("/getMessage", messageType, async (req, res) => {
  res.send("message received");
  for (let i = 0; i < req.body?.entry.length; i++)
    for (let j = 0; j < req.body?.entry[i]?.changes.length; j++)
      for (let k = 0; k < req.body?.entry[i]?.changes[j]?.value?.messages?.length; k++) {
        // to monitor multiple message

        const phno = req.body.entry[i].changes[j].value.messages[k].from
        const message = req.body.entry[i].changes[j].value.messages[k].text?.body //|| req.body.entry[i].changes[j].value.messages[k]?.interactive?.button_reply?.title || req.body.entry[i].changes[j].value.messages[k].interactive?.list_reply?.title
        const type = req.body.entry[i].changes[j].value.messages[k].type
        const messageBody = req.body.entry[i].changes[j].value.messages[k]


        if (type == "reaction")
          return
        let file = null, caption;
        if (!["text", "contacts", "location"].includes(type)) {
          const mediaId = messageBody[type].id;
          caption = messageBody[type].caption;
          const { data: media } = await axios.get(`https://graph.facebook.com/v21.0/${mediaId}/`, { headers: { Authorization: `Bearer ${accessToken}` } })
          const resposeFromMediaServer = await axios.get(media.url, { responseType: "arraybuffer", headers: { Authorization: `Bearer ${accessToken}` } })
          file = new InputFile(resposeFromMediaServer.data);
        }
        const param = { caption: (message || "") + (caption || ""), chat_id: clientChatID, reply_markup: new InlineKeyboard().url(`Chat ${phno} on WA`, `https://api.whatsapp.com/send/?phone=${phno}&text=${message}`) };

        let telegramResponse;
        switch (type) {
          case "text":
            telegramResponse = await bot.api.raw.sendMessage({ text: message, ...param })
            break;
          case "location":
            telegramResponse = await bot.api.raw.sendLocation({ ...param, latitude: messageBody.location.latitude, longitude: messageBody.location.longitude })
            break;
          case "contacts":
            telegramResponse = []
            for (const contact of messageBody.contacts) {
              telegramResponse.push(await bot.api.raw.sendContact({ first_name: contact.name.first_name, last_name: contact.name.last_name, phone_number: contact?.phones[0]?.phone, vcard: convertWhatsAppToVCard(contact), ...param }))
            }
            break;
          case "document":
            telegramResponse = await bot.api.raw.sendDocument({ document: file || "", ...param })
            break;
          case "video":
            telegramResponse = await bot.api.raw.sendVideo({ video: file || "", ...param })
            break;
          case "audio":
            telegramResponse = await bot.api.raw.sendAudio({ audio: file || "", ...param })
            break;
          case "image":
            telegramResponse = await bot.api.raw.sendPhoto({ photo: file || "", ...param })
            break;

          default:
            telegramResponse = await bot.api.raw.sendMessage({ text: message, ...param })
            break;
        }
        console.log(phno, message, type, telegramResponse);
      }
})

function messageType(req: Request, res: Response, next: NextFunction) {
  if (req.body?.entry[0]?.changes[0]?.value?.messages) {
    next()
  }
  else
    res.send("status updated")

}

//Store bot screaming status
let screaming = false;

//Create a new bot
const bot = new Bot(process.env.TOKEN || "");



//This function handles the /scream command
bot.command("scream", () => {
  screaming = true;
});

//This function handles /whisper command
bot.command("whisper", () => {
  screaming = false;
});

//Pre-assign menu text
const firstMenu = "<b>Menu 1</b>\n\nA beautiful menu with a shiny inline button.";
const secondMenu = "<b>Menu 2</b>\n\nA better menu with even more shiny inline buttons.";

//Pre-assign button text
const nextButton = "Next";
const backButton = "Back";
const tutorialButton = "Tutorial";

//Build keyboards
const firstMenuMarkup = new InlineKeyboard().text(nextButton, nextButton);

const secondMenuMarkup = new InlineKeyboard().text(backButton, backButton).text(tutorialButton, "https://core.telegram.org/bots/tutorial");


//This handler sends a menu with the inline buttons we pre-assigned above
bot.command("menu", async (ctx) => {
  await ctx.reply(firstMenu, {
    parse_mode: "HTML",
    reply_markup: firstMenuMarkup,
  });
});

//This handler processes back button on the menu
bot.callbackQuery(backButton, async (ctx) => {
  //Update message content with corresponding menu section
  await ctx.editMessageText(firstMenu, {
    reply_markup: firstMenuMarkup,
    parse_mode: "HTML",
  });
});

//This handler processes next button on the menu
bot.callbackQuery(nextButton, async (ctx) => {
  //Update message content with corresponding menu section
  await ctx.editMessageText(secondMenu, {
    reply_markup: secondMenuMarkup,
    parse_mode: "HTML",
  });
});
// bot.

//This function would be added to the dispatcher as a handler for messages coming from the Bot API
bot.on("message", async (ctx) => {
  //Print to console
  console.log(JSON.stringify(ctx));
  console.log(
    `${ctx.from.first_name} wrote ${"text" in ctx.message ? ctx.message.text : ""
    }`,
  );

  if (screaming && ctx.message.text) {
    //Scream the message
    await ctx.reply(ctx.message.text.toUpperCase(), {
      entities: ctx.message.entities,
    });
  } else {
    //This is equivalent to forwarding, without the sender's name
    await ctx.copyMessage(ctx.message.chat.id);
  }
});

//Start the Bot
bot.start();

app.listen(3000, () => {
  console.log("App running in 3000");
})
