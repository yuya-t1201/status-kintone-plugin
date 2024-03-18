(function (PLUGIN_ID) {
  // ステータス名とアクションボタン名を取得してセレクトボックスに追加する関数
  async function populateSelectBoxes() {
    const statusUrl = kintone.api.url('/k/v1/app/status.json', true);
    const actionUrl = kintone.api.url('/k/v1/app/status.json', true); // 修正
    const app = kintone.app.getId();

    try {
      // ステータス名を取得してセレクトボックスに追加
      const statusResponse = await kintone.api(statusUrl, 'GET', { app });
      const statusSelect = document.getElementById('fromStatus');
      for (const statusName of Object.keys(statusResponse.states)) {
        const option = document.createElement('option');
        option.value = statusName;
        option.textContent = statusName;
        statusSelect.appendChild(option);
      }

      // アクションボタン名を取得してセレクトボックスに追加
      const actionResponse = await kintone.api(actionUrl, 'GET', { app });
      const actionSelect = document.getElementById('doAction');
      for (const action of actionResponse.actions) {
        const option = document.createElement('option');
        option.value = action.name;
        option.textContent = action.name;
        actionSelect.appendChild(option);
      }

    } catch (error) {
      console.error('Failed to retrieve status and action names:', error);
    }
  }

  // ステータスを一括更新する関数
  async function bulkUpdateStatus() {
    const fromStatus = document.getElementById('fromStatus').value;
    const doAction = document.getElementById('doAction').value;

    const getUrl = kintone.api.url('/k/v1/records', true);
    const putUrl = kintone.api.url('/k/v1/records/status', true);

    let currentQuery = kintone.app.getQueryCondition();
    if (currentQuery != '') {
      currentQuery += ' and ';
    }

    const getBody = {
      app: kintone.app.getId(),
      fields: ['$id'],
      query: `${currentQuery}ステータス = "${fromStatus}" limit 100`,
    };

    try {
      const resp = await kintone.api(getUrl, 'GET', getBody);
      const ids = resp.records.map((record) => record.$id.value);
      const putBody = {
        app: kintone.app.getId(),
        records: ids.map((id) => ({
          id,
          action: doAction,
        })),
      };
      const message = `${ids.length}件のレコードのステータスを更新します。\n
        変更前のステータス：${fromStatus}\n
        実行アクション：${doAction}`;
      const result = window.confirm(message);
      if (!result) {
        throw new Error('処理中断しました');
      }
      const putResp = await kintone.api(putUrl, 'PUT', putBody);
      alert('ステータスの一括更新が完了しました');
      window.location.reload();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('ステータスの更新中にエラーが発生しました');
    }
  }

  kintone.events.on('app.record.index.show', () => {
    populateSelectBoxes();

    const headerEl = kintone.app.getHeaderMenuSpaceElement();
    if (headerEl === null) {
      throw new Error('The header element is unavailable on this page.');
    }

    const selectDiv = document.createElement('div');
    selectDiv.innerHTML = `
      <label for="fromStatus">変更前のステータス:</label>
      <select id="fromStatus"></select>
      <label for="doAction">実行アクション名（ボタン名）:</label>
      <select id="doAction"></select>
      <button id="bulkUpdateButton">ステータスを一括更新</button>
    `;
    headerEl.appendChild(selectDiv);

    const bulkUpdateButton = document.getElementById('bulkUpdateButton');
    bulkUpdateButton.addEventListener('click', bulkUpdateStatus);
  });
})(kintone.$PLUGIN_ID);
