"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token, //u1Token is not admin
  adminToken,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /companies */

describe("POST /jobs", function () {
  const newJob = {
    title: "puncher",
    salary: 12345,
    equity: "0.5",
    companyHandle: "c1",
  };

  test("ok for admins", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      job: newJob,
    });
  });

  test("not admin, no access", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("bad request with missing data", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send({})
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send({
        title: "puncher",
        salary: "a lot of money please",
        equity: "0.5",
        companyHandle: "c1",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /jobs */

describe("GET /jobs", function () {
  test("ok for anon", async function () {
    const resp = await request(app).get("/jobs");
    expect(resp.body).toEqual({
      jobs: [
        {
          title: "j1",
          salary: 1000,
          equity: "0.1",
          companyHandle: "c1",
        },
        {
          title: "j2",
          salary: 2000,
          equity: "0.2",
          companyHandle: "c2",
        },
        {
          title: "j3",
          salary: 3000,
          equity: "0.3",
          companyHandle: "c3",
        },
        {
          title: "j4",
          equity: null,
          salary: 4000,
          companyHandle: "c3",
        },
      ],
    });
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE jobs CASCADE");
    const resp = await request(app)
      .get("/jobs")
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(500);
  });

  /************************************** GET /companies/query   */
  test("job title query", async function () {
    const resp = await request(app).get("/jobs").query({ title: "j1" });
    expect(resp.body).toEqual({
      jobs: [
        {
          title: "j1",
          salary: 1000,
          equity: "0.1",
          companyHandle: "c1",
        },
      ],
    });
  });

  test("minSalary query", async function () {
    const resp = await request(app).get("/jobs").query({ minSalary: 3000 });
    expect(resp.body).toEqual({
      jobs: [
        {
          title: "j3",
          salary: 3000,
          equity: "0.3",
          companyHandle: "c3",
        },
        {
          title: "j4",
          equity: null,
          salary: 4000,
          companyHandle: "c3",
        },
      ],
    });
  });

  test("hasEquity query", async function () {
    const resp = await request(app).get("/jobs").query({ hasEquity: true });
    expect(resp.body).toEqual({
      jobs: [
        {
          title: "j1",
          salary: 1000,
          equity: "0.1",
          companyHandle: "c1",
        },
        {
          title: "j2",
          salary: 2000,
          equity: "0.2",
          companyHandle: "c2",
        },
        {
          title: "j3",
          salary: 3000,
          equity: "0.3",
          companyHandle: "c3",
        },
      ],
    });
  });

  
  test("multi query", async function () {
    const resp = await request(app).get(
      "/jobs"
    ).query({title: "j", minSalary:3000, hasEquity: true});
    expect(resp.body).toEqual({
      jobs: [
          {
            title: "j3",
            salary: 3000,
            equity: "0.3",
            companyHandle: "c3",
          },
      ],
    });
  });


});

/************************************** GET /jobs/:id */

describe("GET /jobs/:id", function () {
  test("works for anon", async function () {
    const resp = await request(app).get(`/jobs/1`);
    expect(resp.body).toEqual({
      job: {
        title: "j1",
        salary: 1000,
        equity: "0.1",
        companyHandle: "c1",
      },
    });
  });

  test("not found for no such job", async function () {
    const resp = await request(app).get(`/jobs/6000`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /companies/:handle */

describe("PATCH /jobs/:id", function () {
  test("works for admins", async function () {
    const resp = await request(app)
      .patch(`/jobs/1`)
      .send({
        title: "super j1",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({
      job: {
        title: "super j1",
        salary: 1000,
        equity: "0.1",
        companyHandle: "c1",
      },
    });
  });

  test("not admin, no access", async function () {
    const resp = await request(app)
      .patch(`/jobs/11`)
      .send({
        title: "failed j1",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const resp = await request(app).patch(`/jobs/1`).send({
      title: "failed j1",
    });
    expect(resp.statusCode).toEqual(401);
  });

  test("not found on no such company", async function () {
    const resp = await request(app)
      .patch(`/jobs/6000`)
      .send({
        title: "failed j1",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request on handle change attempt", async function () {
    const resp = await request(app)
      .patch(`/jobs/1`)
      .send({
        handle: "new",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request on invalid data", async function () {
    const resp = await request(app)
      .patch(`/jobs/1`)
      .send({
        salary: "lot of money",
      })
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", function () {
  test("works for users", async function () {
    const resp = await request(app)
      .delete(`/jobs/1`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({});
  });

  test("not admin, no access", async function () {
    const resp = await request(app)
      .delete(`/jobs/1`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const resp = await request(app).delete(`/jobs/1`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such job", async function () {
    const resp = await request(app)
      .delete(`/job/50000`)
      .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });
});
