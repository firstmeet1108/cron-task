import { Context, Schema } from "koishi";
import { extractFromXml } from "@extractus/feed-extractor";
import dayjs from "dayjs";
import { getMsg } from "./test";
export const name = "rss";
declare module "koishi" {
  interface Tables {
    cron_task: CronTask;
  }
}

interface CronTask {
  id: number;
  name: string;
  cron: string;
  guild: string[];
  disabled: boolean;
  create_time: Date;
}
export interface Config {}

export const Config: Schema<Config> = Schema.object({});

export function apply(ctx: Context) {
  // write your plugin here
  ctx.model.extend("cron_task", {
    id: {
      type: "unsigned",
      primaryKey: true,
    },
    name: {
      type: "string",
      unique: true,
    },
    cron: "string",
    guild: "string",
    disabled: "boolean",
    create_time: "timestamp",
  });
  ctx
    .command("cron-task", "定时任务管理", { authority: 1 })
    .action(async ({ session }) => {
      console.log("cron-task");
      // 获得 数据对象result
      const data = await ctx.http.get(
        "https://rsshub.app/epicgames/freegames/zh"
      );
      const decoder = new TextDecoder("utf-8");
      const result = extractFromXml(decoder.decode(data));
      console.log(result);

      // 使用对象生成文本
      let massages = [`${result.title}\n`];
      for (const item of result.entries) {
        massages.push(
          `\n${item.title}\n${item.link}\n${item.description}\n${dayjs(
            item.published
          ).format("YYYY-MM-DD HH:mm:ss")}\n`
        );
      }
      session.send(getMsg(massages));
    });
}

const taskMap = {
  EPIC: function (ctx) {
    ctx.cron("0 0 0 * * *", async () => {
      const tasks = await ctx.database.get("EPIC", {
        name: "EPIC",
      });
      for (const task of tasks) {
        if (task.disabled) continue;
        for (const guild of task.guild) {
          await ctx.app.bots[0].sendGroupMsg(
            +guild,
            `执行定时任务：${task.name}`
          );
        }
      }
    });
  },
};
