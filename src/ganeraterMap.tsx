import { xml2js } from 'xml-js';
import { h } from 'koishi';
import dayjs from 'dayjs';
import { taskHandlerMap } from './index';

export function ganerateMsg(rssObj: any) {
  const items = rssObj.item.map((item: any) => {
    return (
      <message>
        <p>标题：{item.title._text}</p>
        <p>链接：{item.link._text}</p>
        <p>描述：{h.parse(item.description._text)}</p>
        <p>
          免费时间截至：
          {dayjs(item.pubDate._text)
            .add(7, 'day')
            .hour(23)
            .format('YYYY-MM-DD HH:mm:ss')}
        </p>
      </message>
    );
  });

  return (
    <message forward>
      <message>标题：{rssObj.title._text}</message>
      {items}
    </message>
  );
}

export const generateOptionsContent = (
  listArr: Array<keyof taskHandlerMap> | void
) => {
  if (!listArr) {
    return <message>当前未订阅任何内容</message>;
  }
  return (
    <message>
      <p>当前已订阅的内容：</p>
      {listArr.map((item, idx) => (
        <p>
          No.{idx} --- {item}{' '}
        </p>
      ))}
    </message>
  );
};
