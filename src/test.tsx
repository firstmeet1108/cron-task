export function getMsg(arr) {
  return (
    <message forward>
      {arr.map((e) => (
        <message>{e}</message>
      ))}
    </message>
  );
}
