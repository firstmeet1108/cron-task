import { Context, Schema } from 'koishi';
import { generateOptionsContent } from './ganeraterMap';

export const name = 'rss';
declare module 'koishi' {
  interface Tables {
    cron_task: CronTask;
  }
}

interface CronTask {
  id: number;
  name: string;
  target_id: number;
  create_time: Date;
}

interface CommandOptionsHandlerMap {
  list?: (target_id: number, ctx: Context) => Promise<(keyof taskHandlerMap)[]>;
  all?: (ctx: Context) => void;
}

export interface taskHandlerMap {
  epic: () => void;
  steam: () => void;
  github: () => void;
}

const taskHandlerMap: taskHandlerMap = {
  epic: () => {
    console.log('EPIC');
  },
  steam: () => {
    console.log('STEAM');
  },
  github: () => {
    console.log('GITHUB');
  },
};

const commandOptionsHandlerMap: CommandOptionsHandlerMap = {
  list: async (target_id, ctx) => {
    // 获取订阅列表
    const tasks = await ctx.database
      .select('cron_task', {
        target_id,
      })
      .groupBy('name')
      .execute();
    return tasks.map((task) => task.name) as (keyof taskHandlerMap)[] | null;
  }, // 用户订阅的内容列表
  all: async () => {
    return Object.keys(taskHandlerMap);
  }, // 所有可订阅的内容列表
};

export interface Config {}

export const Config: Schema<Config> = Schema.object({});

export function apply(ctx: Context) {
  // write your plugin here
  ctx.model.extend('cron_task', {
    id: {
      type: 'unsigned',
    },
    name: {
      type: 'string',
    },
    target_id: 'integer',
    create_time: 'timestamp',
  });
  ctx
    .command('subscribe <task_name:string>', '定时任务管理', {
      authority: 2,
    })
    .option('list', '-l') // 任务列表
    .option('all', '-a') // 所有任务
    .alias('sub')
    .action(async ({ options, session }, task_name) => {
      // 错误校验
      try {
        if (isEmptyObject(options) && task_name === undefined) {
          // 未输入 任务名 和 选项
          throw new Error('请输入订阅内容');
        } else if (Object.keys(options).length > 1) {
          // 输入多个选项
          throw new Error('请勿输入多个选项');
        } else if (!isEmptyObject(options) && task_name !== undefined) {
          // 同时输入了任务名和选项
          throw new Error('请勿同时输入任务名和选项');
        } else if (
          // 未知选项
          !isEmptyObject(options) &&
          commandOptionsHandlerMap[Object.keys(options)[0]] === undefined
        ) {
          throw new Error('未知选项, 使用 sub -h 查看帮助');
        }
      } catch (e) {
        session.send(e.message);
        return;
      }

      // 获取必要数据
      const messageData = session.event._data;
      const target_id: number & Context = // 群号或者用户号
        messageData.message_type === 'group'
          ? messageData.group_id
          : messageData.user_id;
      // 当前可用数据
      // target_id 群号或者用户号
      // task_name 任务名
      // options 选项
      // 选项动作
      if (!isEmptyObject(options)) {
        const option: keyof CommandOptionsHandlerMap = Object.keys(
          options
        )[0] as keyof CommandOptionsHandlerMap; // 用户选择
        const listArr = await commandOptionsHandlerMap[option](target_id, ctx);
        session.send(generateOptionsContent(listArr));
        return;
      }

      // 任务动作
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
