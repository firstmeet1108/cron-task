import { Context, Schema } from "koishi";
import { extractFromXml } from '@extractus/feed-extractor'
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
      const data = await ctx.http.get("https://rsshub.app/bilibili/weekly", {
        proxy: {
          host: "127.0.0.1",
          port: 7890,
        },
      });
      const decoder = new TextDecoder("utf-8");
      const text = decoder.decode(data);
      const result = extractFromXml(text);
      console.log(result);
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
