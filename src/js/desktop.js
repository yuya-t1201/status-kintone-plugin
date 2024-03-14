(function (PLUGIN_ID) {
  kintone.events.on('app.record.index.show', () => {
    const headerEl = kintone.app.getHeaderMenuSpaceElement();
    if (headerEl === null) {
      throw new Error('The header element is unavailable on this page.');
    }

    const buttonEl = document.createElement('button');

    buttonEl.textContent = 'ステータス一括更新';
    buttonEl.classList.add('plugin-space-button');

    // スタイルを追加
    buttonEl.style.backgroundColor = '#ff8c94'; // かわいいピンク色
    buttonEl.style.color = 'white';
    buttonEl.style.border = 'none';
    buttonEl.style.padding = '10px 20px';
    buttonEl.style.borderRadius = '5px';
    buttonEl.style.cursor = 'pointer';
    buttonEl.style.fontFamily = 'Arial, sans-serif';
    buttonEl.style.fontSize = '16px';

    buttonEl.addEventListener('click', async function () {
      const fromStatus = window.prompt('更新対象ステータス：');
      const doAction = window.prompt('実行アクション名（ボタン名）');

      const condition = {
        fromStatus,
        doAction,
      };

      const getUrl = kintone.api.url('/k/v1/records', true);
      const putUrl = kintone.api.url('/k/v1/records/status', true);

      let currentQuery = kintone.app.getQueryCondition();
      if (currentQuery != '') {
        currentQuery += ' and ';
      }

      const getBody = {
        app: kintone.app.getId(),
        fields: ['$id'],
        query: `${currentQuery}ステータス = "${condition.fromStatus}" limit 100`,
      };

      try {
        const resp = await kintone.api(getUrl, 'GET', getBody);
        const ids = resp.records.map((record) => record.$id.value);
        const putBody = {
          app: kintone.app.getId(),
          records: ids.map((id) => ({
            id,
            action: condition.doAction,
          })),
        };
        console.log(putBody);
        const message = `${ids.length}件のレコードのステータス更新をします。
          対象ステータス：${condition.fromStatus}
          実行アクション：${condition.doAction}`;
        const result = window.confirm(message);
        if (!result) {
          throw new Error('処理中断しました');
        }
        const putResp = await kintone.api(putUrl, 'PUT', putBody);
        console.log(putResp);
        alert('ステータスの一括更新が完了しました');
        window.location.reload();
      } catch (error) {
        console.log(error);
        alert('処理中断しました');
      }
    });

    headerEl.appendChild(buttonEl);
  });
})(kintone.$PLUGIN_ID);
