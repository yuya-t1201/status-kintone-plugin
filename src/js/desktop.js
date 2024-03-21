(function (PLUGIN_ID) {
  // ステータス名とアクションボタン名を取得してセレクトボックスに追加する関数
  async function populateSelectBoxes() {
    const statusUrl = kintone.api.url('/k/v1/app/status.json', true);
    const actionUrl = kintone.api.url('/k/v1/app/status.json', true); // 修正
    const app = kintone.app.getId();
    const headerEl = kintone.app.getHeaderMenuSpaceElement(); // ヘッダーメニュー領域の要素を取得

    try {
      // ステータス名を取得してセレクトボックスに追加
      const statusResponse = await kintone.api(statusUrl, 'GET', { app });
      const sortedStatusNames = Object.keys(statusResponse.states).sort(
        (a, b) => b.localeCompare(a),
      ); // ステータス名を降順にソート
      const dropdownStatuses = sortedStatusNames.map((status) => ({
        label: status,
        value: status,
      }));

      const dropdownStatus = new Kuc.Dropdown({
        label: "一括変更するステータス",
        requiredIcon: true,
        items: dropdownStatuses,
        className: 'status-class',
        id: 'statusDropdown', // 初期値（任意）
        visible: true, // 表示状態（任意）
        disabled: false, // 無効状態（任意）
      });

      // アクションボタン名を取得してセレクトボックスに追加
      const actionResponse = await kintone.api(actionUrl, 'GET', { app });
      const dropdownActions = actionResponse.actions.map((action) => ({
        label: action.name,
        value: action.name,
      }));

      const dropdownAction = new Kuc.Dropdown({
        label: "対応するアクション名",
        requiredIcon: true,
        items: dropdownActions,
        className: 'action-class',
        id: 'actionDropdown', // 初期値（任意）
        visible: true, // 表示状態（任意）
        disabled: false, // 無効状態（任意）
      });

      // ヘッダーメニュー領域にドロップダウンとボタンを追加
      headerEl.appendChild(dropdownStatus);
      headerEl.appendChild(dropdownAction);

      return headerEl; // ここでheaderElを返す
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
  async function bulkUpdateStatus(headerEl) {
    const fromStatus = headerEl.querySelector('#statusDropdown').value;
    const doAction = headerEl.querySelector('#actionDropdown').value;

    if (!fromStatus) {
      alert('ステータスを選択してください');
      return; // 処理を中断してユーザーにアクションの選択を促す
    }

    if (!doAction) {
      alert('アクション名を選択してください');
      return; // 処理を中断してユーザーにアクションの選択を促す
    }

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
      } else if (
        error.message ===
        'ステータスの変更に失敗しました。ほかのユーザーがステータス、またはステータスの設定を変更した可能性があります。'
      ) {
        alert('ステータスに対するアクション名が間違っています。');
      } else {
        alert('ステータスの更新中にエラーが発生しました');
      }
    }
  }

  kintone.events.on('app.record.index.show', async () => {
    // asyncを追加
    // 他の初期化処理（populateSelectBoxesなど）を実行
    const headerEl = await populateSelectBoxes(); // populateSelectBoxesがPromiseを返すのでawaitを使用して結果を待つ

    if (headerEl === null) {
      throw new Error('The header element is unavailable on this page.');
    }

    // ボタン要素を取得し、クリックイベントリスナーを追加
    const bulkUpdateButton = new Kuc.Button({
      text: 'ステータスを一括更新', // ボタンのテキスト
      type: 'submit', // ボタンのタイプ
      content: '', // ボタンの内容は空にします
      className: 'options-class', // ボタンのクラス名
      id: 'bulkUpdateButton', // ボタンのID
      visible: true,
      disabled: false, // ボタンの無効状態
    });

    // ボタンをドロップダウンの右側に追加
    headerEl.appendChild(bulkUpdateButton);

    // ボタンクリック時のイベントリスナーを追加
    bulkUpdateButton.addEventListener('click', () =>
      bulkUpdateStatus(headerEl),
    ); // headerElを引数として渡す
  });
})(kintone.$PLUGIN_ID);
