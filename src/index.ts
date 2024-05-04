import { Context, Schema } from 'koishi';
import dayjs from 'dayjs';
import { ganerateMsg } from './ganerateMsg';
import { xml2js } from 'xml-js';
export const name = 'rss';
declare module 'koishi' {
  interface Tables {
    cron_task: CronTask;
  }
}

interface CronTask {
  id: number;
  name: string;
  target_id: string;
  create_time: Date;
}
export interface Config {}

export const Config: Schema<Config> = Schema.object({});

export function apply(ctx: Context) {
  // write your plugin here
  ctx.model.extend('cron_task', {
    id: {
      type: 'unsigned',
      primaryKey: true,
    },
    name: {
      type: 'string',
      unique: true,
    },
    target_id: 'string',
    create_time: 'timestamp',
  });
  ctx
    .command('subscribe <task_name>', '定时任务管理', { authority: 2 })
    .option('list', '-l') // 任务列表
    .alias('sub')
    .action(async ({ session, options }, task_name) => {
      if (isEmptyObject(options)) {
        console.log('options', options);
      }

      const messageData = session.event._data;
      const target_id = // 群号或者用户号
        messageData.message_type === 'group'
          ? messageData.group_id
          : messageData.user_id;

      console.log('task_name', task_name); // 任务名
      console.log('options', options); // 选项
      const tasks = await ctx.database
        .select('cron_task', {})
        .groupBy('name')
        .execute();
      console.log(tasks);
    });
}

// 获得 数据对象result
// const data = await ctx.http.get(
//   "https://rsshub.app/epicgames/freegames/zh-CN"
// );
// const decoder = new TextDecoder("utf-8");
// const result = xml2js(decoder.decode(data), { compact: true }).rss
//   .channel;

// const massages = ganerateMsg(result);
// session.send(massages);

// const taskMap = {
//   EPIC: function (ctx) {
//     ctx.cron("0 0 0 * * *", async () => {
//       const tasks = await ctx.database.get("EPIC", {
//         name: "EPIC",
//       });
//       for (const task of tasks) {
//         if (task.disabled) continue;
//         for (const guild of task.guild) {
//           await ctx.app.bots[0].sendGroupMsg(
//             +guild,
//             `执行定时任务：${task.name}`
//           );
//         }
//       }
//     });
//   },
// };

const isEmptyObject = (obj: object): boolean => {
  return Object.keys(obj).length === 0;
};

type task_name = 'EPIC' | 'STEAM' | 'GITHUB';

const taskMap: {
  [key in task_name]: () => void;
} = {
  EPIC: function () {
    console.log('EPIC');
  },
  STEAM: function () {
    console.log('STEAM');
  },
  GITHUB: function () {
    console.log('GITHUB');
  },
};
