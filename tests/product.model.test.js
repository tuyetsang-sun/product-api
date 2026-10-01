const test = require('node:test');
const assert = require('node:assert/strict');
const Product = require('../src/models/Product');

function createProduct(overrides = {}) {
    return new Product({
        pid: 'SP_TEST01',
        pname: 'Ban phim',
        price: 250000,
        quantity: 10,
        ...overrides
    });
}

async function expectValidationError(overrides, field) {
    const product = createProduct(overrides);

    await assert.rejects(
        () => product.validate(),
        (error) =>
        error.name === 'ValidationError' &&
        Boolean(error.errors[field])
    );
}

test('Chap nhan san pham hop le', async() => {
    const product = createProduct();

    await assert.doesNotReject(() => product.validate());

    assert.equal(product.pid, 'SP_TEST01');
    assert.equal(product.pname, 'Ban phim');
    assert.equal(product.price, 250000);
    assert.equal(product.quantity, 10);
});

test('Chap nhan price va quantity bang 0', async() => {
    const product = createProduct({
        price: 0,
        quantity: 0
    });

    await assert.doesNotReject(() => product.validate());
});

test('Tu choi san pham thieu pid', async() => {
    await expectValidationError({ pid: undefined }, 'pid');
});

test('Tu choi pid co khoang trang', async() => {
    await expectValidationError({ pid: 'SP TEST01' }, 'pid');
});

test('Tu choi pname chi co khoang trang', async() => {
    await expectValidationError({ pname: '   ' }, 'pname');
});

test('Tu choi price am', async() => {
    await expectValidationError({ price: -1000 }, 'price');
});

test('Tu choi quantity am', async() => {
    await expectValidationError({ quantity: -1 }, 'quantity');
});

test('Tu choi quantity la so thap phan', async() => {
    await expectValidationError({ quantity: 1.5 }, 'quantity');
});