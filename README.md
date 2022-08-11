# guardduty-chatbot stacks

## npm install

```bash
npm install
```

## chatbotの変数設定

`bin/`配下ファイルに以下を設定する。

- applicationId
- pinpointRole

```typescript
new StepfunctionsStack(app, `${projectName}-${envValues.envName}-stepfunctions`, {
  projectName: projectName,
  envName: envValues.envName,
  env: env,
  applicationId: "YOUR_APPLICATION_ID",
  pinpointRole: "YOUR_PINPOINT_ROLE",
  bucket: s3.bucket,
});
```

## デプロイ

```shell
npx cdk deploy --all -c env=dev --require-aproval never
```

## ブログリンク

[Step FunctionsでPinpointのセグメント作成とキャンペーン配信を自動化してみた | DevelopersIO](https://dev.classmethod.jp/articles/pinpoint-campaign-distribution-automation/)
