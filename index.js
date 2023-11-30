const { Client, GatewayIntentBits, ActivityType, EmbedBuilder } = require("discord.js");
require("dotenv").config();
const mysql = require("mysql");

const bot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.MessageContent
    ]
});

// Bot prefix.
const prefix = "~";

// Coin theme.
const coin = "Silver Hand Recruit";
const pick = "recruit";
const coinImage = "https://i.imgur.com/POsqoi5.png";
const embedImage = "https://i.imgur.com/enUGC3q.png";
const embedColour = "#E6AC00";

// ID of the server in which coins are posted.
const coinServer = process.env.SERVER_ID;

// ID of the channel in which coins are posted.
const coinChannel = process.env.CHANNEL_ID;

// Probability of posting a coin for each message. (100 = 1 in 100)
const prob = 1000;

// Array to store data after querying the database.
var coins = [];
coins.push({});

// Array to store message IDs of unpicked coins.
var unpicked = [];

// Leaderboard numbers.
const ranks = [];
ranks[0] = "🥇 ";
ranks[1] = "🥈 ";
ranks[2] = "🥉 ";
for(i = 3; i < 10; i++){
    ranks[i] = (i + 1) + ". ";
};

// List of cards that can be bought from the shop.
var shop = [];
shop["UNG_960"] = { name: "Lost in the Jungle", cost: 10, description: `Whenever you ${pick} a ${coin}, gain 1 more.`, image: "https://i.imgur.com/d8h6WOq.png" };
// shop["JAM_010"] = { name: "Jukebox Totem", cost: 20, description: `Once per week, gain a ${coin}.` };

// shopFields can be inserted into embed fields. shopKeys can be inserted into query columns.
var shopFields = [];
var shopKeys = "";
for (card in shop) {
    shopFields.push({ name: `\`${shop[card].name}\``, value: `**Cost**: ${shop[card].cost} ${coin}s\n**Description**: ${shop[card].description} [(Card)](${shop[card].image})` });
    shopKeys = `${shopKeys}, ${card}`;
}

// Sets up a connection to the database.
var con = mysql.createPool({
    connectionLimit: 10,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE
});

// Connects to the database and extracts coin data.
con.getConnection(err => {
    if (err) throw err;
    console.log("Connected to database.");
    con.query(`SELECT id, value, xp${shopKeys} FROM \`${coinServer}\``, function(err, result) {
        if (err) throw err;
        for (i = 0; i < Object.size(result); i++) {
            coins[(result[i].id)] = {
                value: result[i].value,
                xp: result[i].xp
            };
            for (card in shop) {
                coins[(result[i].id)][card] = result[i][card];
            };
        };
        coins.shift();
        console.log("The current leaderboard is:")
        console.log(coins);
    });
});

// Function that counts the number of properties in an object.
Object.size = function(obj) {
    let size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    };
    return size;
};

bot.on("ready", () => {
    console.log("This bot is online.");

    // Sets the activity of the bot.
    bot.user.setPresence({
        activities: [{ name: "the Light.", type: ActivityType.Watching }]
    });

    // Pings the database connection periodically.
    setInterval(function() {
        con.ping(reconnect = true);
        const date = new Date()
        console.log(`Pinged at ${date.getTime()}.`);
    }, 86400000);
});

bot.on("messageCreate", message => {
    // Ignores its own messages.
    if (message.author.bot) return;

    // Responds when someone says "tirion".
    if (message.content.toLowerCase() == "tirion") {
        message.channel.send({ content: "```Put your faith in the Light!```" });
    };

    // Only reads commands that start with the correct prefix.
    if (message.content.startsWith(prefix)) {

        // Stores command arguments as an array.
        let args = message.content.substring(prefix.length).split(" ");

        // Reads 1st argument.
        switch(args[0]) {
            case "help":
                // Sends help embed.
                const helpEmbed = new EmbedBuilder()
                .setColor(embedColour)
                .setTitle("Help")
                .setDescription(`\`electronite\` needs you to gather recruits for the Order of the Silver Hand. Each message you send comes with a 1 in ${prob} probability of finding a recruit, so venture forth and send messages!`)
                .setThumbnail(embedImage)
                .addFields([
                    { name: "Commands", value: `Type \`${prefix}commands\` for a list of commands.` }
                ]);
                message.channel.send({ embeds: [helpEmbed] });
                break;

            case "commands":
                // Sends commands embed.
                const commandsEmbed = new EmbedBuilder()
                .setColor(embedColour)
                .setTitle("Commands")
                .setDescription("Type `tirion` for a response!")
                .setThumbnail(embedImage)
                .addFields([
                    { name: `\`${prefix}help\``, value: "Displays information about Tirion." },
                    { name: `\`${prefix}commands\``, value: "Displays a list of commands." },
                    { name: `\`${prefix}${pick}\``, value: `Recruits a ${coin}.` },
                    { name: `\`${prefix}profile\``, value: `Displays how many ${coin}s you have ${pick}ed and your card collection.` },
                    { name: `\`${prefix}lb\``, value: "Displays the leaderboard." },
                    { name: `\`${prefix}shop\``, value: `Displays the shop. You can buy cards using ${coin}s.` },
                    { name: `\`${prefix}buy <card>\``, value: `Buys a card using ${coin}s.`}
                ]);
                message.channel.send({ embeds: [commandsEmbed] });
                break;

            case pick:
                // Checks if a coin can be picked in the correct channel.
                if (unpicked.length > 0 && message.channel.id == coinChannel) {
                    // If the picker has not picked a coin before, creates an entry for them in the database.
                    if (!coins[message.author.id]) {
                        coins[message.author.id] = {
                            value: unpicked.length,
                            xp: unpicked.length
                        };
                        for (card in shop) {
                            coins[message.author.id][card] = 0;
                        };
                        unpicked.length == 1 ? s = "" : s = "s";
                        message.channel.send({ content: `${message.author}\`\`\`You have ${pick}ed ${pick} ${coin}${s}.\`\`\`` });

                        // Updates the database.
                        con.query(`INSERT INTO \`${coinServer}\` (id, value, xp${shopKeys}) VALUES ("${message.author.id}", ${coins[message.author.id].value}, ${coins[message.author.id].xp}${", 0".repeat(Object.keys(shop).length)})`, function (err, result) {
                            result.affectedRows == 1 ? s = "" : s = "s";
                            console.log(`${result.affectedRows} record${s} inserted.`);
                        });
                    }
                    else {
                        // If the recruiter owns Lost in the Jungle, gives 1 additional coin.
                        if (coins[message.author.id]["UNG_960"]) {
                            coins[message.author.id].value += unpicked.length * 2;
                            coins[message.author.id].xp += unpicked.length;
                            unpicked.length == 1 ? s = "" : s = "s";
                            message.channel.send({ content: `${message.author}\`\`\`You have ${pick}ed ${unpicked.length} ${coin}${s}. Because you own ${shop["UNG_960"].name}, you have gained ${unpicked.length} more.\`\`\`` });
                        }
                        else {
                            coins[message.author.id].value += unpicked.length;
                            coins[message.author.id].xp += unpicked.length;
                            unpicked.length == 1 ? s = "" : s = "s";
                            message.channel.send({ content: `${message.author}\`\`\`You have ${pick}ed ${unpicked.length} ${coin}${s}.\`\`\`` });
                        };

                        // Updates the database.
                        con.query(`UPDATE \`${coinServer}\` SET value = ${coins[message.author.id].value}, xp = ${coins[message.author.id].xp} WHERE id = ${message.author.id}`, function(err, result) {
                            if (err) throw err;
                            result.affectedRows == 1 ? s = "" : s = "s";
                            console.log(`${result.affectedRows} record${s} updated.`);
                        });
                    };

                    // Deletes the messages for unpicked coins.
                    bot.channels.fetch(coinChannel).then(channel => {
                        unpicked.forEach(msg => {
                                channel.messages.delete(msg)
                                .catch((err) => {
                                    console.log("Message could not be deleted.")
                                });
                        });

                        // Clears the message IDs for unpicked coins.
                        unpicked = [];
                    });
                }
                else {
                    message.channel.send({ content: `${message.author}\`\`\`There are no ${coin}s to ${pick}.\`\`\`` })
                };
                break;

            case "profile":
                let number = 0;
                let hasCards = false;
                let collection = ""

                // If the author has an entry in the database, checks if they own any cards.
                if (message.author.id in coins) {
                    number = coins[message.author.id].value;
                    for (card in shop) {
                        if (coins[message.author.id][card]) {
                            collection += `• \`${shop[card].name}\`\n`
                            hasCards = true;
                        };
                    };
                };
                if (!hasCards) {
                    collection = "You do not own any cards.";
                };

                // Creates profile embed.
                number == 1 ? s = "" : s = "s";
                const profileEmbed = new EmbedBuilder()
                .setColor(embedColour)
                .setTitle(`\`${message.author.globalName}\``)
                .setDescription(`**Order of the Silver Hand**`)
                .setThumbnail(message.author.displayAvatarURL())
                .setFields([
                    { name: `:shield: \`${coin}s\``, value: `You have ${pick}ed \`${number}\` ${coin}${s}.` },
                    { name: ":card_box: `Collection`", value: collection }
                ]);
                message.channel.send({ embeds: [profileEmbed] });
                break;

            case "lb":
                // If nobody has picked a coin before, creates a different leaderboard embed noting this.
                if (Object.keys(coins).length == 0) {
                    const lbEmbed = new EmbedBuilder()
                    .setColor(embedColour)
                    .setThumbnail(embedImage)
                    .setTitle("Leaderboard")
                    .setDescription(`Nobody has ${pick}ed any ${coin}s yet.`);
                    message.channel.send({ embeds: [lbEmbed] });
                }
                else {
                    // Sorts array.
                    let coinsSorted = [];
                    for (let member in coins) {
                        coinsSorted.push([member, coins[member].value]);
                    }
                    coinsSorted.sort(function(a, b) {
                        return b[1] - a[1]; // Descending order.
                    });

                    // Converts array into embed fields.
                    let lb = [];
                    for (i = 0; i < Object.size(coinsSorted); i++) {
                        lb.push({ name: `${ranks[0]} ${bot.users.cache.get(coinsSorted[i][0]).globalName}`, value: `${coin}s: \`${coinsSorted[i][1]}\`` });
                    };

                    // Creates leaderboard embed.
                    const lbEmbed = new EmbedBuilder()
                        .setColor(embedColour)
                        .setTitle("Leaderboard")
                        .setThumbnail(embedImage)
                        .addFields(lb);
                    message.channel.send({ embeds: [lbEmbed] });
                };
                break;

            case "shop":
                // Creates shop embed.
                const shopEmbed = new EmbedBuilder()
                .setColor(embedColour)
                .setTitle("Shop")
                .setThumbnail(embedImage)
                .addFields(shopFields);
                message.channel.send({ embeds: [shopEmbed] });
                break;

            case "buy":
                // Checks if the argument matches any card in the shop.
                for (card in shop) {
                    // Removes "~buy " from the message to get the argument.
                    if (message.content.slice(5) == shop[card].name) {
                        // If the buyer does not have an entry in the database, they must not have enough coins to buy anything.
                        if (!coins[message.author.id]) {
                            message.channel.send({ content: `${message.author}\`\`\`You do not have enough ${coin}s.\`\`\`` });
                        }
                        // Checks if the buyer already owns the card.
                        else if (coins[message.author.id][card]) {
                            message.channel.send({ content: `${message.author}\`\`\`You already own this card.\`\`\``});
                        }
                        // Checks if the buyer has enough coins.
                        else if (coins[message.author.id].value < shop[card].cost) {
                            message.channel.send({ content: `${message.author}\`\`\`You do not have enough ${coin}s.\`\`\`` });
                        }
                        else {
                            // Gives the buyer the card and takes the correct number of coins.
                            coins[message.author.id][card] = 1;
                            coins[message.author.id].value -= 10;

                            // Creates embed displaying the newly bought card.
                            const boughtEmbed = new EmbedBuilder()
                            .setColor(embedColour)
                            .setDescription(`${message.author}\n\nYou have bought \`${shop[card].name}\` for ${shop[card].cost} ${coin}s!`)
                            .setImage(shop[card].image);
                            message.channel.send({ embeds: [boughtEmbed] });

                            // Updates the database.
                            con.query(`UPDATE \`${coinServer}\` SET value = ${coins[message.author.id].value}, ${card} = 1 WHERE id = ${message.author.id}`, function(err, result) {
                                if (err) throw err;
                                result.affectedRows == 1 ? s = "" : s = "s";
                                console.log(`${result.affectedRows} record${s} updated.`);
                            });
                        }
                        break;
                    };
                };
                break;
        };
    };

    // Only posts coins in the coin channel.
    if (message.channel.id == coinChannel) {
        // Each message has a small probability of posting a coin.
        let rand = Math.floor(Math.random() * prob);
        if (rand == 0) {
            const coinEmbed = new EmbedBuilder()
            .setColor(embedColour)
            .setDescription(`Here is a ${coin}. Type \`${prefix}${pick}\` to ${pick} it.`)
            .setImage(coinImage);
            message.channel.send({ embeds: [coinEmbed] })
            // Adds message ID to unpicked coins.
            .then(sent => {
                let id = sent.id;
                unpicked.push(id);
            });
        };
    };
});

bot.login(process.env.DISCORD_TOKEN);