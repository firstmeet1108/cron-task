import { Context, Schema } from 'koishi';
import {} from 'koishi-plugin-cron';
import { commandGeneratorMap, cronTaskGeneratorMap } from './ganeraterMap';
import { xml2js } from 'xml-js';
import dayjs from 'dayjs';

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
  type: 'private' | 'group';
  create_time: Date;
}

export interface TaskHandlerMap {
  epic: (ctx: Context) => any;
  // steam: () => void;
  // github: () => void;
}

const taskHandlerMap: TaskHandlerMap = {
  epic: async (ctx) => {
    const toRenderData = await getRssData(
      'https://rsshub.app/epicgames/freegames/zh-CN',
      ctx
    );
    // console.log(toRenderData);
    // const id = toRenderData.lastBuildDate._text;
    // const date = dayjs(id);
    // console.log(date);
    const toSendData = cronTaskGeneratorMap['epic'](toRenderData);

    return toSendData;
  },
  // steam: () => {
  //   console.log('STEAM');
  // },
  // github: () => {
  //   console.log('GITHUB');
  // },
};

type UserContext = {
  target_id: string;
  task_name: keyof TaskHandlerMap;
  type: 'private' | 'group';
  option: keyof CommandOptionsHandlerMap;
};

interface CommandOptionsHandlerMap {
  subscribe: (
    userContext: UserContext,
    ctx: Context
  ) => Promise<{ type: 'subscribe'; data: null }>;
  list: (
    userContext: UserContext,
    ctx: Context
  ) => Promise<{ type: 'list'; data: (keyof TaskHandlerMap)[] }>;
  all: () => Promise<{ type: 'all'; data: (keyof TaskHandlerMap)[] }>;
}

const commandOptionsHandlerMap: CommandOptionsHandlerMap = {
  subscribe: async ({ target_id, task_name, type }, ctx) => {
    // 订阅
    const res = await ctx.database.create('cron_task', {
      name: task_name,
      target_id,
      type: type,
      create_time: new Date(),
    });
    return {
      type: 'subscribe',
      data: null,
    };
  },
  list: async ({ target_id }, ctx) => {
    // 用户订阅的内容列表
    const tasks = await ctx.database
      .select('cron_task', {
        target_id,
      })
      .groupBy('name')
      .execute();
    return {
      type: 'list',
      data: tasks.map((task) => task.name) as (keyof TaskHandlerMap)[] | null,
    };
  },
  all: async () => {
    // 所有可订阅的内容列表
    return { type: 'all', data: getKeys(taskHandlerMap) };
  },
};

export const inject = ['cron'];

export interface Config {}

export const Config: Schema<Config> = Schema.object({});

export async function apply(ctx: Context) {
  // 创建数据库
  ctx.model.extend(
    'cron_task',
    {
      id: 'unsigned',
      name: 'string',
      target_id: 'string',
      type: 'string',
      create_time: 'timestamp',
    },
    {
      autoInc: true,
      unique: [['name', 'target_id', 'type']],
    }
  );
  // 命令模块
  ctx
    .command('subscribe <task_name:string>', '定时任务管理')
    .option('list', '-l') // 任务列表
    .option('all', '-a') // 所有任务
    .alias('sub')
    .action(async ({ options, session }, task_name) => {
      // 错误校验
      try {
        if (isEmptyObject(options) && task_name === undefined) {
          // 未输入 任务名 和 选项
          throw new Error('请输入订阅内容');
        } else if (
          isEmptyObject(options) &&
          !Object.keys(taskHandlerMap).includes(task_name)
        ) {
          // 选项为空 且 任务名不在任务列表中
          throw new Error('未知任务名, 使用 sub -a 查看所有任务');
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
      const target_id: number & Context =
        messageData.message_type === 'group'
          ? messageData.group_id
          : messageData.user_id;

      const option: keyof CommandOptionsHandlerMap = (
        Object.keys(options).length === 1
          ? Object.keys(options)[0]
          : 'subscribe'
      ) as keyof CommandOptionsHandlerMap;

      // 当前可用数据
      const userContext: UserContext = {
        target_id: target_id.toString(), // 群号或者用户号
        type: messageData.message_type,
        task_name: task_name as keyof TaskHandlerMap, // 任务名
        option, // 选项
      };
      // 希望得到 待渲染数据data
      const toRenderData = await commandOptionsHandlerMap[option](
        userContext,
        ctx
      );
      const toSendData = commandGeneratorMap[option](toRenderData.data);
      session.send(toSendData);
    });
  ctx
    .command('test', 'test', {
      authority: 2,
    })
    .action(async ({ session }) => {
      const onebot = ctx.bots[0];
      // taskHandlerMap['epic']({}, ctx);

      // await onebot.sendPrivateMessage('2022742378', 'test');
      // for (const task_name in taskHandlerMap) {
      //   const dataList = await ctx.database.get(
      //     'cron_task',
      //     {
      //       name: task_name,
      //     },
      //     ['target_id', 'type']
      //   );
      //   console.log(dataList);
      //   dataList.forEach(async (e) => {
      //     if (e.type === 'group') {
      //       await onebot.sendMessage(e.target_id, 'epic');
      //     } else {
      //       await onebot.sendPrivateMessage(e.target_id, 'epic');
      //     }
      //   });
      // }
    });

  // 定时任务模块
  // 0 0 12 ? * FRI 每周五中午12点
  // 0/5 * * * * ? 每5秒
  ctx.cron('0 0 12 ? * FRI', async () => {
    const onebot = ctx.bots[0];
    const toSendData = await taskHandlerMap['epic'](ctx);
    for (const task_name in taskHandlerMap) {
      const dataList = await ctx.database.get(
        'cron_task',
        {
          name: task_name,
        },
        ['target_id', 'type']
      );
      console.log(dataList);
      dataList.forEach(async (e) => {
        if (e.type === 'group') {
          await onebot.sendMessage(e.target_id, toSendData);
        } else {
          await onebot.sendPrivateMessage(e.target_id, toSendData);
        }
      });
    }
  });
}
// 任务动作
// toRenderData = await taskHandlerMap[task_name](userContext, ctx);
// const toSendData = generateContent(toRenderData);
// session.send(toSendData);

// 获得 数据对象result

// const massages = ganerateMsg(result);
// session.send(massages);

const isEmptyObject = (obj: object): boolean => {
  return Object.keys(obj).length === 0;
};

const getKeys = <T extends object>(obj: T): (keyof T)[] => {
  return Object.keys(obj) as (keyof T)[];
};

const getRssData = async (url: string, ctx: Context) => {
  const data = await ctx.http.get(url);
  const decoder = new TextDecoder('utf-8');
  const result = (xml2js(decoder.decode(data), { compact: true }) as any).rss
    .channel;
  return result;
};
