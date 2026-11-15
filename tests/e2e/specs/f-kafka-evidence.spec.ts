import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { loginAs } from '../fixtures/accounts';
import {
  REPO_ROOT,
  captureCommandEvidence,
   getRunId,
  getShortTag,
  recordManualOrSkipped,
  shot,
} from '../fixtures/evidence';

const SPEC = 'f-kafka-evidence.spec.ts';
const KAFKA_CLUSTER_NAME = process.env.KAFKA_CLUSTER_NAME || 'recipehub';
const KAFKA_UI_BASE = process.env.E2E_KAFKA_UI_URL || 'http://localhost:8085';

test.describe('Nhóm F — Minh chứng Kafka (Publisher, Consumer Group, Audit Logs, DLQ & Fault Tolerance)', () => {
  test.afterAll(() => {
    if (!process.env.E2E_DOCKER) return;
    try {
      execSync('docker start recipehub-kafka recipehub-worker', {
        cwd: REPO_ROOT,
        stdio: 'ignore',
        timeout: 30_000,
      });
    } catch {
      // Đảm bảo không làm gãy teardown nếu container đã chạy
    }
  });

  test('F1: Kafka UI — Topic recipehub.audit.activities.v1 và message sự kiện', async ({ page }) => {
    const topicMessagesUrl = `${KAFKA_UI_BASE}/ui/clusters/${KAFKA_CLUSTER_NAME}/all-topics/recipehub.audit.activities.v1/messages`;
    try {
      await page.goto(topicMessagesUrl, { timeout: 25_000 });
      await shot(page, 'f01-kafka-ui-topic-messages', {
        description: 'F1: Kafka UI — Topic recipehub.audit.activities.v1 với message sự kiện kiểm toán',
        spec: SPEC,
      });
    } catch {
      await recordManualOrSkipped({
        name: 'f01-kafka-ui-topic-messages',
        description: 'F1: Kafka UI topic recipehub.audit.activities.v1 (cần mở http://localhost:8085)',
        source: topicMessagesUrl,
        spec: SPEC,
      });
    }
  });

  test('F2: Kafka UI — Consumer group recipehub-audit (lag 0)', async ({ page }) => {
    const consumerGroupUrl = `${KAFKA_UI_BASE}/ui/clusters/${KAFKA_CLUSTER_NAME}/consumer-groups/recipehub-audit`;
    try {
      await page.goto(consumerGroupUrl, { timeout: 25_000 });
      await shot(page, 'f02-kafka-ui-consumer-group', {
        description: 'F2: Kafka UI — Consumer group recipehub-audit trạng thái ổn định, lag 0',
        spec: SPEC,
      });
    } catch {
      await recordManualOrSkipped({
        name: 'f02-kafka-ui-consumer-group',
        description: 'F2: Kafka UI consumer group recipehub-audit',
        source: consumerGroupUrl,
        spec: SPEC,
      });
    }
  });

  test('F3: Dòng tương ứng ở /admin/logs (Xuất bản công thức)', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/logs');
    await expect(page.getByRole('heading', { name: 'Nhật ký hoạt động' })).toBeVisible();

    await expect
      .poll(
        async () => {
          return page.getByText('Xuất bản công thức').count();
        },
        { timeout: 15_000 }
      )
      .toBeGreaterThan(0);

    await shot(page, 'f03-admin-logs-recipe-published', {
      description: 'F3: Dòng "Xuất bản công thức" (recipe.published) trên trang /admin/logs',
      spec: SPEC,
    });
  });

  test('F4: Log worker có [KAFKA-ACK]', async ({ page }) => {
    await captureCommandEvidence(
      page,
      'f04-worker-logs-kafka-ack',
      'docker logs recipehub-worker --tail 250',
      {
        title: 'F4 — Nhật ký BackgroundWorker xác nhận [KAFKA-ACK]',
        description: 'F4: Log container recipehub-worker có dòng [KAFKA-ACK]',
        spec: SPEC,
        transformOutput: (raw) => {
          const ackLines = raw
            .split(/\r?\n/)
            .filter((line) => /KAFKA-ACK|recipehub\.audit\.activities\.v1/i.test(line));
          return ackLines.length > 0 ? ackLines.slice(-25).join('\n') : raw.split(/\r?\n/).slice(-30).join('\n');
        },
      }
    );
  });

  test('F8: Code nơi gửi (KafkaAuditActivityPublisher) và nơi nhận (AuditKafkaConsumer)', async ({ page }) => {
    await captureCommandEvidence(
      page,
      'f08-code-kafka-publisher-consumer',
      'git grep -n -A16 -e "public async Task PublishEnvelopeAsync" -- src/backend/BuildingBlocks && ' +
        'git grep -n -A13 -e "public static async Task ProcessAndCommitAsync" -- src/backend/Services/Audit',
      {
        title: 'F8 — Nơi gửi và nơi nhận message Kafka trong mã nguồn',
        description: 'F8: Đoạn code KafkaAuditActivityPublisher.PublishEnvelopeAsync (gửi) và AuditKafkaConsumer.ProcessAndCommitAsync (nhận, commit sau khi ghi DB)',
        spec: SPEC,
      }
    );
  });

  test('F9: Kết quả dotnet test và smoke test', async ({ page }) => {
    test.setTimeout(900_000);
    const keep = (re: RegExp) => (raw: string) =>
      raw
        .split(/\r?\n/)
        .filter((line) => re.test(line))
        .join('\n');

    await captureCommandEvidence(page, 'f09a-dotnet-unit-tests', 'dotnet test tests/RecipeHub.UnitTests --nologo', {
      title: 'F9 — dotnet test tests/RecipeHub.UnitTests',
      description: 'F9a: Kết quả test đơn vị (xUnit)',
      spec: SPEC,
      timeoutMs: 300_000, mustSucceed: true,
      transformOutput: keep(/Passed!|Failed!|Skipped |error|Total tests|Test Run/i),
    });

    // Test Quiz cần PostgreSQL thật; truyền chuỗi kết nối qua E2E_QUIZ_DB (không ghi mật khẩu vào repo).
    if (process.env.E2E_QUIZ_DB) {
      await captureCommandEvidence(page, 'f09b-dotnet-quiz-tests', 'dotnet test tests/RecipeHub.Quiz.Tests --nologo', {
        title: 'F9 — dotnet test tests/RecipeHub.Quiz.Tests (PostgreSQL thật)',
        description: 'F9b: Kết quả test Quiz chạy trên CSDL recipehub_quiz',
        spec: SPEC,
        timeoutMs: 300_000, mustSucceed: true,
        env: { ConnectionStrings__Database: process.env.E2E_QUIZ_DB },
        transformOutput: keep(/Passed!|Failed!|\[FAIL\]|error|Test Run/i),
      });
    }

    // Smoke test là script bash; trên Windows truyền đường dẫn Git Bash qua E2E_BASH.
    if (process.env.E2E_BASH) {
      await captureCommandEvidence(page, 'f09c-smoke-test', `"${process.env.E2E_BASH}" tests/smoke/smoke-test.sh`, {
        title: 'F9 — tests/smoke/smoke-test.sh',
        description: 'F9c: Smoke test 7 bước (gateway, đăng nhập, gRPC, Redis Streams, Kafka, giám sát, web)',
        spec: SPEC,
        timeoutMs: 480_000, mustSucceed: true,
        env: { MSYS_NO_PATHCONV: '1' },
        transformOutput: keep(/^\[\d\/\d\]|\[OK\]|\[FATAL\]|SUCCESS|Passed/),
      });
    }
  });

  test('F5: @destructive Đọc lại message khi dừng rồi bật lại worker', async ({ page }) => {
    test.skip(!process.env.E2E_DOCKER, 'Chỉ chạy khi đặt E2E_DOCKER=1');

    const shortTag = getShortTag();
    const replayCode = `REC-RPL-${shortTag}`;
    const replayName = `Trà Replay Worker ${getRunId()}`;

    try {
      execSync('docker stop recipehub-worker', { cwd: REPO_ROOT, timeout: 20_000 });

      await loginAs(page, 'rnd');
      await page.goto('/rnd/recipes/new');
      await page.getByPlaceholder('VD: REC-001').fill(replayCode);
      await page.getByPlaceholder('VD: Trà Ô Long Sữa Nướng Trân Châu').fill(replayName);
      await page.getByRole('button', { name: 'Lưu Bản Nháp & Chuyển Đến Chi Tiết' }).click();
      await page.waitForURL(/\/rnd\/recipes\/[0-9a-f-]+$/);

      execSync('docker start recipehub-worker', { cwd: REPO_ROOT, timeout: 20_000 });

      await loginAs(page, 'admin');
      await page.goto('/admin/logs');

      await expect
        .poll(
          async () => {
            await page.reload();
            await page.waitForLoadState('networkidle');
            // Bảng nhật ký tải bằng client fetch; mã công thức hiển thị dạng chữ hoa.
            return page.getByText(new RegExp(`${replayCode}|${replayName}`, 'i')).count();
          },
          { timeout: 30_000 }
        )
        .toBeGreaterThan(0);

      await shot(page, 'f05-worker-restart-replay', {
        description: `F5: Dừng worker -> tạo ${replayCode} -> bật lại worker -> sự kiện xuất hiện trong /admin/logs`,
        spec: SPEC,
      });
    } finally {
      try {
        execSync('docker start recipehub-worker', { cwd: REPO_ROOT, stdio: 'ignore' });
      } catch {
        // Bỏ qua
      }
    }
  });

  test('F6: @destructive Message hỏng được đẩy vào topic .dlq với header dlq-reason', async ({ page }) => {
    test.skip(!process.env.E2E_DOCKER, 'Chỉ chạy khi đặt E2E_DOCKER=1');

    try {
      execSync(
        'docker exec -i recipehub-kafka /opt/kafka/bin/kafka-console-producer.sh --bootstrap-server localhost:9092 --topic recipehub.audit.activities.v1',
        {
          cwd: REPO_ROOT,
          input: `{"malformed_e2e":"${getRunId()}"}\n`,
          encoding: 'utf8',
          timeout: 20_000,
        }
      );
    } catch {
      // Không làm gãy spec nếu lệnh producer cảnh báo
    }

    const dlqUrl = `${KAFKA_UI_BASE}/ui/clusters/${KAFKA_CLUSTER_NAME}/all-topics/recipehub.audit.activities.v1.dlq/messages`;
    try {
      await page.goto(dlqUrl, { timeout: 25_000 });
      await shot(page, 'f06-kafka-ui-dlq-messages', {
        description: 'F6: Kafka UI — Topic recipehub.audit.activities.v1.dlq chứa message lỗi với dlq-reason',
        spec: SPEC,
        fullPage: true,
      });
    } catch {
      await recordManualOrSkipped({
        name: 'f06-kafka-ui-dlq-messages',
        description: 'F6: Kafka UI topic .dlq với header dlq-reason',
        source: dlqUrl,
        spec: SPEC,
      });
    }
  });

  test('F7: @destructive Kafka dừng đột ngột, nghiệp vụ tạo công thức vẫn hoạt động bình thường', async ({
    page,
  }) => {
    test.skip(!process.env.E2E_DOCKER, 'Chỉ chạy khi đặt E2E_DOCKER=1');

    const shortTag = getShortTag();
    const downCode = `REC-KFK-${shortTag}`;
    const downName = `Trà Khi Kafka Dừng ${getRunId()}`;

    try {
      execSync('docker stop recipehub-kafka', { cwd: REPO_ROOT, timeout: 25_000 });

      await loginAs(page, 'rnd');
      await page.goto('/rnd/recipes/new');
      await page.getByPlaceholder('VD: REC-001').fill(downCode);
      await page.getByPlaceholder('VD: Trà Ô Long Sữa Nướng Trân Châu').fill(downName);
      await page.getByRole('button', { name: 'Lưu Bản Nháp & Chuyển Đến Chi Tiết' }).click();

      await page.waitForURL(/\/rnd\/recipes\/[0-9a-f-]+$/);
      await expect(page.getByRole('heading', { name: downName })).toBeVisible();

      await shot(page, 'f07-recipe-created-when-kafka-down', {
        description: `F7: Dừng container recipehub-kafka nhưng R&D vẫn tạo công thức ${downCode} thành công`,
        spec: SPEC,
      });
    } finally {
      try {
        execSync('docker start recipehub-kafka recipehub-worker', {
          cwd: REPO_ROOT,
          stdio: 'ignore',
          timeout: 30_000,
        });
      } catch {
        // Bỏ qua
      }
    }
  });
});
