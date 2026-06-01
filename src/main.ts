import { TelegramClient } from '@mtcute/bun'
import { Dispatcher } from '@mtcute/dispatcher'
import { BotKeyboard } from '@mtcute/core'
import { env } from './env.ts'

const tg = new TelegramClient({
    apiId: env.API_ID,
    apiHash: env.API_HASH,
    storage: 'bot-data/session',
})

const dp = Dispatcher.for(tg)

const CHANNEL = '@Gram_Coin_Prices'
const CHANNEL_URL = 'https://t.me/Gram_Coin_Prices'

function formatPrice(raw: number): string {
    let fixed = raw.toFixed(4)
    if (fixed.endsWith('0')) {
        fixed = raw.toFixed(3)
        if (fixed.endsWith('0')) {
            fixed = raw.toFixed(2)
        }
    }
    const [int, dec] = fixed.split('.')
    const formatted = Number(int).toLocaleString('en-US')
    return `${formatted}.${dec}$`
}

async function fetchPrice(): Promise<string | null> {
    try {
        const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=TONUSDT')
        const data = await res.json()
        return formatPrice(Number(data.price))
    } catch {
        return null
    }
}

async function sendPrice(): Promise<void> {
    const price = await fetchPrice()
    if (price) await tg.sendText(CHANNEL, price)
}

function msUntilNextMultipleOf5(): number {
    const now = new Date()
    const minutes = now.getMinutes()
    const seconds = now.getSeconds()
    const nextMinute = Math.ceil((minutes + 1) / 5) * 5
    const minutesLeft = nextMinute - minutes
    return minutesLeft * 60_000 - seconds * 1_000
}

dp.onNewMessage(async (msg) => {
    if (msg.text !== '/start') return

    const price = await fetchPrice()
    const text = price
        ? `welcome to gram price bot\nprice now : ${price}`
        : 'Failed to fetch price'

    const keyboard = BotKeyboard.inline([
        [BotKeyboard.url('Gram price', CHANNEL_URL)],
    ])

    await msg.replyText(text, { replyMarkup: keyboard })
})

await tg.start({ botToken: env.BOT_TOKEN })

console.log('Bot is running')

setTimeout(async () => {
    await sendPrice()
    setInterval(sendPrice, 300_000)
}, msUntilNextMultipleOf5())