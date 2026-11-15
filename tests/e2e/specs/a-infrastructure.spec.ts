import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { expect, test } from '@playwright/test';
import { loginAs } from '../fixtures/accounts';
import {
  COMPOSE_FILE,
  REPO_ROOT,
  captureCommandEvidence,
  recordManualOrSkipped,
  shot,
} from '../fixtures/evidence';

const SPEC = 'a-infrastructure.spec.ts';
const KAFKA_CLUSTER_NAME = process.env.KAFKA_CLUSTER_NAME || 'recipehub';

test.describe('Nhóm A — Hạ tầng (theo thứ tự kiểm tra)', () => {
  test('A1: Danh sách container đang chạy (docker compose ps)', async ({ page }) => {
    await captureCommandEvidence(
      page,
      'a01-docker-compose-ps',
      `docker compose -f "${COMPOSE_FILE}" ps`,
      {
        title: 'A1 — Trạng thái các container trong Docker Compose',
        description: 'A1: Danh sách container đang chạy, trạng thái healthy (docker compose ps)',
        spec: SPEC,
      }
    );
  });

  test('A2b: psql — danh sách 5 CSDL tách riêng', async ({ page }) => {
    await captureCommandEvidence(
      page,
      'a02b-psql-list-databases',
      'docker exec recipehub-postgres sh -c "psql -U \\"$POSTGRES_USER\\" -d postgres -c \\"SELECT datname AS csdl, pg_get_userbyid(datdba) AS chu_so_huu FROM pg_database WHERE datname LIKE \'recipehub_%\' ORDER BY 1\\""',
      {
        title: 'A2 — PostgreSQL: 5 CSDL riêng cho 5 service',
        description: 'A2b: psql liệt kê 5 CSDL recipehub_* và tài khoản sở hữu',
        spec: SPEC,
        mustSucceed: true,
      }
    );
  });

  test('A2: pgAdmin — 5 cơ sở dữ liệu PostgreSQL', async ({ page }) => {
    const pgAdminUrl = process.env.E2E_PGADMIN_URL || 'http://localhost:5050';
    const pgAdminEmail = process.env.PGADMIN_EMAIL || 'admin@recipehub.vn';
    const pgAdminPassword = process.env.PGADMIN_PASSWORD || 'admin123';

    try {
      await page.goto(pgAdminUrl, { timeout: 20_000 });
      // pgAdmin 4 bên thứ ba: nếu hiện trang login thì đăng nhập, nếu SERVER_MODE=False thì vào thẳng
      const emailInput = page.locator('input[name="email"]'); // TODO verify selector (pgAdmin third-party login form)
      if ((await emailInput.count()) > 0 && (await emailInput.first().isVisible())) {
        await emailInput.first().fill(pgAdminEmail);
        await page.locator('input[name="password"]').first().fill(pgAdminPassword); // TODO verify selector (pgAdmin password input)
        await page.locator('button[type="submit"], input[type="submit"]').first().click(); // TODO verify selector (pgAdmin submit button)
      }
      // pgAdmin tải giao diện khá lâu; chờ cây "Servers" hiện ra rồi mở nhánh server cấu hình sẵn.
      await page.getByText('Servers', { exact: false }).first().waitFor({ state: 'visible', timeout: 60_000 });
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
      await page.getByText(/Loading pgAdmin/).waitFor({ state: 'hidden', timeout: 60_000 }).catch(() => {});
      await shot(page, 'a02-pgadmin-databases', {
        description: 'A2: pgAdmin đã cấu hình sẵn kết nối tới PostgreSQL của RecipeHub',
        spec: SPEC,
      });
    } catch {
      await recordManualOrSkipped({
        name: 'a02-pgadmin-databases',
        description: 'A2: pgAdmin 5 CSDL (chụp tay tại http://localhost:5050 nếu chưa mở cổng)',
        source: pgAdminUrl,
        spec: SPEC,
      });
    }
  });

  test('A3: Cấu hình 5 route trong Gateway/appsettings.json', async ({ page }) => {
    const gatewayConfigPath = path.join(
      REPO_ROOT,
      'src/backend/Gateway/RecipeHub.Gateway/appsettings.json'
    );
    const content = await fs.readFile(gatewayConfigPath, 'utf8').catch(() => '');
    await captureCommandEvidence(
      page,
      'a03-gateway-routes',
      'git ls-files src/backend/Gateway/RecipeHub.Gateway/appsettings.json',
      {
        title: 'A3 — Cấu hình 5 tuyến YARP trong Gateway/appsettings.json (kèm chụp tay IDE)',
        description: 'A3: File Gateway/appsettings.json đoạn 5 route (ghi chú chụp tay IDE + bản trích xuất)',
        spec: SPEC,
        transformOutput: () => content || 'Xem trực tiếp file src/backend/Gateway/RecipeHub.Gateway/appsettings.json',
      }
    );
  });

  test('A4–A8: Swagger của 5 microservice (Identity, Recipe, Content, Audit, Quiz)', async ({ page }) => {
    const services = [
      { code: 'a04-swagger-identity', name: 'Identity Service', port: 5001 },
      { code: 'a05-swagger-recipe', name: 'Recipe Service', port: 5002 },
      { code: 'a06-swagger-content', name: 'Content Service', port: 5003 },
      { code: 'a07-swagger-audit', name: 'Audit Service', port: 5004 },
      { code: 'a08-swagger-quiz', name: 'Quiz Service', port: 5005 },
    ];

    for (const svc of services) {
      const swaggerUrl = `http://localhost:${svc.port}/swagger/index.html`;
      try {
        const res = await page.goto(swaggerUrl, { timeout: 8_000 });
        if (res && res.ok()) {
          await shot(page, svc.code, {
            description: `${svc.code.toUpperCase().slice(0, 3)}: Swagger UI của ${svc.name}`,
            spec: SPEC,
          });
          continue;
        }
      } catch {
        // Cổng nội bộ không mở ra host trong compose mặc định
      }

      await recordManualOrSkipped({
        name: svc.code,
        description: `${svc.code.toUpperCase().slice(0, 3)}: Swagger ${svc.name} (chụp tay khi chạy dotnet run hoặc mở cổng ${svc.port})`,
        source: swaggerUrl,
        spec: SPEC,
      });
    }
  });

  test('A9: Thư mục Contracts/Protos với các file .proto và gRPC client', async ({ page }) => {
    await captureCommandEvidence(
      page,
      'a09-grpc-protos',
      'git ls-files "src/backend/Contracts/RecipeHub.GrpcContracts/**/*.proto"',
      {
        title: 'A9 — Danh sách hợp đồng gRPC (.proto) trong RecipeHub.GrpcContracts (kèm chụp tay IDE)',
        description: 'A9: Thư mục Contracts/…/Protos với các file .proto (ghi chú chụp tay IDE)',
        spec: SPEC,
      }
    );
  });

  test('A10: Kafka UI — Cluster recipehub và 2 topic', async ({ page }) => {
    const kafkaUiBase = process.env.E2E_KAFKA_UI_URL || 'http://localhost:8085';
    const topicsUrl = `${kafkaUiBase}/ui/clusters/${KAFKA_CLUSTER_NAME}/all-topics`;
    try {
      await page.goto(topicsUrl, { timeout: 20_000 });
      await shot(page, 'a10-kafka-ui-topics', {
        description: `A10: Kafka UI cluster ${KAFKA_CLUSTER_NAME} và danh sách topic`,
        spec: SPEC,
      });
    } catch {
      await recordManualOrSkipped({
        name: 'a10-kafka-ui-topics',
        description: 'A10: Kafka UI cluster và 2 topic (cần container recipehub-kafka-ui chạy ở cổng 8085)',
        source: topicsUrl,
        spec: SPEC,
      });
    }
  });

  test('A11: Redis Streams — XINFO GROUPS content.image-drafts.v1', async ({ page }) => {
    await captureCommandEvidence(
      page,
      'a11-redis-xinfo-groups',
      'docker exec recipehub-redis redis-cli XINFO GROUPS content.image-drafts.v1',
      {
        title: 'A11 — Redis Streams Consumer Group (content.image-drafts.v1)',
        description: 'A11: Redis XINFO GROUPS content.image-drafts.v1',
        spec: SPEC,
      }
    );
  });

  test('A12: Grafana — Bảng tổng quan giám sát và hàng Kafka', async ({ page }) => {
    const grafanaUrl = process.env.E2E_GRAFANA_URL || 'http://localhost:3001/d/recipehub-monitoring';
    try {
      await page.goto(grafanaUrl, { timeout: 25_000 });
      await shot(page, 'a12-grafana-dashboard', {
        description: 'A12: Grafana bảng tổng quan giám sát hệ thống và hàng Kafka',
        spec: SPEC,
        fullPage: true,
      });
    } catch {
      await recordManualOrSkipped({
        name: 'a12-grafana-dashboard',
        description: 'A12: Grafana dashboard (cần container recipehub-grafana chạy ở cổng 3001)',
        source: grafanaUrl,
        spec: SPEC,
      });
    }
  });

  test('A13: Trang /admin/system — 5 dịch vụ sẵn sàng', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/system');

    await expect(
      page.getByRole('heading', { name: 'Giám sát hệ thống & sự cố' })
    ).toBeVisible();

    await expect
      .poll(
        async () => {
          return page.getByText('Sẵn sàng', { exact: true }).count();
        },
        { timeout: 15_000 }
      )
      .toBeGreaterThanOrEqual(5);

    await expect(page.getByText('5 / 5')).toBeVisible();

    await shot(page, 'a13-admin-system-ready', {
      description: 'A13: Trang /admin/system hiển thị 5/5 dịch vụ sẵn sàng',
      spec: SPEC,
      fullPage: true,
    });
  });
});
