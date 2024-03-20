"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  //ids of test jobs is 1,2,3
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */
// title, salary, equity, companyHandle

describe("create", function () {
  const newJob = {
    title: "puncher",
    salary: 12345,
    equity: "0.5",
    companyHandle: "c1",
  };

  test("works", async function () {
    let job = await Job.create(newJob);
    expect(job).toEqual(newJob);

    const result = await db.query(
      `SELECT title, salary, equity, company_handle AS "companyHandle"
           FROM jobs
           WHERE title = 'puncher'`
    );
    expect(result.rows).toEqual([
      {
        title: "puncher",
        salary: 12345,
        equity: "0.5",
        companyHandle: "c1",
      },
    ]);
  });
});

/************************************** findAll */
// ('j1', '10000', 1, 0.1, 'J1'),
//            ('j2', '20000', 2, 0.2, 'J2'),
//            ('j3', '30000', 3, 0.3, 'J3')`
describe("findAll", function () {
  test("works: no filter", async function () {
    let jobs = await Job.findAll();
    expect(jobs).toEqual([
      {
        title: "j1",
        salary: 10000,
        equity: "0.1",
        companyHandle: "c1",
      },
      {
        title: "j2",
        salary: 20000,
        equity: "0.2",
        companyHandle: "c2",
      },
      {
        title: "j3",
        salary: 30000,
        equity: "0.3",
        companyHandle: "c3",
      },
    ]);
  });
});

/************************************** get */

describe("get", function () {
  test("works", async function () {
    let job = await Job.get(1);

    expect(job).toEqual({
      title: "j1",
      salary: 10000,
      equity: "0.1",
      companyHandle: "c1",
      id: 1,
    });
  });

  test("not found if no such job", async function () {
    try {
      await Job.get(69);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** filters */

describe("get filters", function () {
  test("title_filter", async function () {
    let job = await Job.title_filter("j1");
    expect(job).toEqual([
      {
        title: "j1",
        salary: 10000,
        equity: "0.1",
        companyHandle: "c1",
      },
    ]);
  });

  test("minSalary_filter", async function () {
    //2 jobs with 20000 or greater salary
    let job = await Job.minSalary_filter(20000);
    expect(job.length).toEqual(2);
  });

  test("fail minSalary_filter", async function () {
    //No jobs with super high salary
    let job = await Job.minSalary_filter(20000000);
    expect(job.length).toEqual(0);
  });

  test("hasEquity_filter", async function () {
    // setting true gives only company with equity
    let job = await Job.hasEquity_filter(true);
    expect(job.length).toEqual(3);
  });

  test("false for hasEquity_filter", async function () {
    // setting false just gives all companies
    console.log("false test");
    let job = await Job.hasEquity_filter(false);
    expect(job.length).toEqual(3);
  });

  test("nothing for hasEquity_filter", async function () {
    // nothing just gives all companies
    let job = await Job.hasEquity_filter();
    expect(job.length).toEqual(3);
  });

  test("multi_filter", async function () {
    // j3, min salary 20000 and has equity
    let job = await Job.multi_filter("j3", 20000, true);
    expect(job.length).toEqual(1);
    expect(job).toEqual([
      {
        title: "j3",
        salary: 30000,
        equity: "0.3",
        companyHandle: "c3",
      },
    ]);
  });

  test("multi_filter with false hasEquity", async function () {
    //should still be the same response
    let job = await Job.multi_filter("j3", 20000, false);
    expect(job.length).toEqual(1);
    expect(job).toEqual([
      {
        title: "j3",
        salary: 30000,
        equity: "0.3",
        companyHandle: "c3",
      },
    ]);
  });
});

/************************************** update */

describe("update", function () {
  const updateData = {
    title: "j1111",
    salary: 11111,
    equity: "1",
  };

  test("works", async function () {
    let job = await Job.update(1, updateData);
    expect(job).toEqual({
      companyHandle: "c1",
      ...updateData,
    });

    const result = await db.query(
      `SELECT id, title, salary, equity, company_handle AS "companyHandle"
             FROM jobs
             WHERE id = 1`
    );
    expect(result.rows).toEqual([
      {
        title: "j1111",
        salary: 11111,
        equity: "1",
        companyHandle: "c1",
        id: 1,
      },
    ]);
  });

  test("works: null fields", async function () {
    const updateDataSetNulls = {
      title: "j1111",
      salary: null,
      equity: null,
    };

    let job = await Job.update(1, updateDataSetNulls);
    expect(job).toEqual({
      companyHandle: "c1",
      ...updateDataSetNulls,
    });

    const result = await db.query(
      `SELECT title, salary, equity, company_handle AS "companyHandle"
             FROM jobs
             WHERE id = 1`
    );
    expect(result.rows).toEqual([
      {
        title: "j1111",
        salary: null,
        equity: null,
        companyHandle: "c1",
      },
    ]);
  });

  test("not found if no such job", async function () {
    try {
      await Job.update(69, updateData);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    try {
      await Job.update(1, {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** remove */

describe("remove", function () {
  test("works", async function () {
    await Job.remove(1);
    const res = await db.query("SELECT id FROM jobs WHERE id=1");
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such job", async function () {
    try {
      await Job.remove(69);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});
