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
      const sortedStatusNames = Object.keys(statusResponse.states).sort((a, b) => b.localeCompare(a)); // ステータス名を降順にソート
      for (const statusName of sortedStatusNames) {
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
      if (error instanceof TypeError) {
        alert('ネットワークに問題が発生しました。もう一度試してください。');
      } else {
        alert('ステータスとアクションの名前の取得中にエラーが発生しました。');
      }
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
      if (ids.length === 0) {
        throw new Error('該当するレコードはありません');
      }
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
      if (error.message === '該当するレコードはありません') {
        alert('該当するレコードはありません');
      } else if (error.message === '処理中断しました') {
        // キャンセルの場合は何もしない
      } else if (error.message === '作業者を指定してください。') {
        alert('プロセスの引き戻しはできません');
      } else if (error.message === 'ステータスの変更に失敗しました。ほかのユーザーがステータス、またはステータスの設定を変更した可能性があります。') {
        alert('ステータスに対するアクション名が間違っています。');
      } else {
        alert('ステータスの更新中にエラーが発生しました');
      }
    }
  }

  kintone.events.on('app.record.index.show', () => {
    // 他の初期化処理（populateSelectBoxesなど）を実行
    populateSelectBoxes();
  
    // ヘッダーメニュー領域の要素を取得
    const headerEl = kintone.app.getHeaderMenuSpaceElement();
    if (headerEl === null) {
      throw new Error('The header element is unavailable on this page.');
    }
  
    // ボタンとセレクトボックスを含むHTML要素を生成
    const selectDiv = document.createElement('div');
    selectDiv.innerHTML = `
      <label for="fromStatus">変更前のステータス:</label>
      <select id="fromStatus"></select>
      <label for="doAction">実行アクション名（ボタン名）:</label>
      <select id="doAction"></select>
    `;
  
    // ヘッダーメニュー領域に生成したHTML要素を追加
    headerEl.appendChild(selectDiv);
  
    // ボタン要素を取得し、クリックイベントリスナーを追加
    const bulkUpdateButton = new Kuc.Button({
      text: 'ステータスを一括更新',  // ボタンのテキスト
      type: 'submit',  // ボタンのタイプ
      content: '',  // ボタンの内容は空にします
      className: 'options-class',  // ボタンのクラス名
      id: 'bulkUpdateButton',  // ボタンのID
      visible: true,  // ボタンの表示状態
      disabled: false  // ボタンの無効状態
    });
    selectDiv.appendChild(bulkUpdateButton);  // ボタンをselectDiv内に追加

    // ボタンクリック時のイベントリスナーを追加
    bulkUpdateButton.addEventListener('click', bulkUpdateStatus);
  });
})(kintone.$PLUGIN_ID);
