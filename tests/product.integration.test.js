const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const baseUrl = process.env.API_BASE_URL || 'http://127.0.0.1:3000';

async function request(method, path, expectedStatus, body) {
    const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: body === undefined ?
            {} :
            { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(5000)
    });

    const text = await response.text();

    assert.equal(
        response.status,
        expectedStatus,
        `${method} ${path}: mong doi ${expectedStatus}, ` +
        `nhan ${response.status}. Body: ${text}`
    );

    return text ? JSON.parse(text) : null;
}

function assertProduct(actual, expected) {
    assert.deepEqual({
            pid: actual.pid,
            pname: actual.pname,
            price: actual.price,
            quantity: actual.quantity
        },
        expected
    );
}

test('Product API - kiem thu CRUD thuc te', {
    timeout: 120000
}, async(t) => {
    const pid = `CI_${randomUUID().replaceAll('-', '')}`;

    const product = {
        pid,
        pname: 'Ban phim CI',
        price: 250000,
        quantity: 10
    };

    const updatedProduct = {
        pid,
        pname: 'Ban phim CI da cap nhat',
        price: 300000,
        quantity: 7
    };

    const badPricePid = `${pid}_PRICE`;
    const badQuantityPid = `${pid}_QTY`;

    // Chi don cac ma san pham do lan test nay tao ra.
    t.after(async() => {
        for (const id of[pid, badPricePid, badQuantityPid]) {
            const response = await fetch(
                `${baseUrl}/api/products/${id}`, {
                    method: 'DELETE',
                    signal: AbortSignal.timeout(5000)
                }
            );

            await response.text();

            assert.ok(
                response.status === 200 || response.status === 404,
                `Khong don duoc san pham test ${id}: HTTP ${response.status}`
            );
        }
    });

    await t.test('01 - Healthcheck: API ket noi MongoDB', async() => {
        const data = await request('GET', '/health', 200);

        assert.equal(data.status, 'ok');
        assert.equal(data.mongodb, 'connected');
    });

    await t.test('02 - POST: tao san pham thanh cong', async() => {
        const data = await request(
            'POST', '/api/products', 201, product
        );

        assertProduct(data, product);
        assert.ok(data._id);
    });

    await t.test('03 - GET: doc san pham theo pid', async() => {
        const data = await request(
            'GET', `/api/products/${pid}`, 200
        );

        assertProduct(data, product);
    });

    await t.test('04 - GET: danh sach co san pham vua tao', async() => {
        const data = await request('GET', '/api/products', 200);

        assert.ok(Array.isArray(data));

        const found = data.find((item) => item.pid === pid);

        assert.ok(found, 'Danh sach phai co san pham vua tao');
        assertProduct(found, product);
    });

    await t.test('05 - POST: tu choi pid trung lap', async() => {
        await request('POST', '/api/products', 409, product);
    });

    await t.test('06 - PUT: cap nhat va doc lai du lieu', async() => {
        const updated = await request(
            'PUT', `/api/products/${pid}`, 200, updatedProduct
        );

        assertProduct(updated, updatedProduct);

        const saved = await request(
            'GET', `/api/products/${pid}`, 200
        );

        assertProduct(saved, updatedProduct);
    });

    await t.test('07 - POST: tu choi price am', async() => {
        await request('POST', '/api/products', 400, {
            ...product,
            pid: badPricePid,
            price: -1
        });
    });

    await t.test('08 - POST: tu choi quantity thap phan', async() => {
        await request('POST', '/api/products', 400, {
            ...product,
            pid: badQuantityPid,
            quantity: 1.5
        });
    });

    await t.test('09 - DELETE: xoa va kiem tra khong con', async() => {
        const data = await request(
            'DELETE', `/api/products/${pid}`, 200
        );

        assert.equal(data.pid, pid);

        await request('GET', `/api/products/${pid}`, 404);
    });
});