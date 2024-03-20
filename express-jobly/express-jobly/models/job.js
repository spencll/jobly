"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

class Job {
  static async create({ title, salary, equity, companyHandle }) {
    const result = await db.query(
      `INSERT INTO jobs
           (title, salary, equity, company_Handle)
           VALUES ($1, $2, $3, $4)
           RETURNING title, salary, equity, company_Handle AS "companyHandle" `,
      [title, salary, equity, companyHandle]
    );
    const job = result.rows[0];

    return job;
  }

  /** Find all jobs.
   *
   * Returns [{ title, salary, equity, companyHandle }, ...]
   * */

  static async findAll() {
    const jobsRes = await db.query(
      `SELECT title, salary, equity, company_Handle AS "companyHandle"
           FROM jobs
           ORDER BY title`
    );
    return jobsRes.rows;
  }

  static async title_filter(str) {
    const lower = str.toLowerCase();
    const jobRes = await db.query(
      `SELECT title, salary, equity, company_Handle AS "companyHandle"
      FROM jobs WHERE LOWER(title) LIKE $1
           ORDER BY title`,
      [`%${lower}%`]
    );
    if (!jobRes) throw new NotFoundError("Job not found");
    return jobRes.rows;
  }

  static async minSalary_filter(num) {
    const jobRes = await db.query(
      `SELECT title, salary, equity, company_Handle AS "companyHandle"
      FROM jobs WHERE salary>=$1
           ORDER BY salary`,
      [num]
    );
    if (!jobRes) throw new NotFoundError("Job not found");
    return jobRes.rows;
  }

  static async hasEquity_filter(hasEquity) {

    if (hasEquity && typeof hasEquity !== "boolean") {
      throw new BadRequestError("hasEquity must be a boolean value");
    }

    // Modifying query based on hasEquity value, false+nothing gives everything. True for hasEquity gives only equity containing jobs

    const jobRes = await db.query(
      `SELECT title, salary, equity, company_Handle AS "companyHandle"
      FROM jobs ${hasEquity ? "WHERE equity IS NOT NULL" : ""}  
           ORDER BY title`
    );
    if (!jobRes) throw new NotFoundError("Job not found");
    return jobRes.rows;
  }

  static async multi_filter(str, minSalary, hasEquity) {
    const titleRes = str ? await Job.title_filter(str) : await Job.findAll();
    const minSalaryRes = minSalary
      ? await Job.minSalary_filter(minSalary)
      : await Job.findAll();
    const equityRes = hasEquity
      ? await Job.hasEquity_filter(hasEquity)
      : await Job.findAll();

    // Finding what's common between all the filtered results using name as the comparison property. Basically SQL JOIN but not using SQL query

    // For every titleRes, check if it's in minSalary Res and equityRes too
    // If so, we grab it

    const common = titleRes.filter(
      (job) =>
        minSalaryRes.some((minSalaryJob) => minSalaryJob.title === job.title) &&
        equityRes.some((hasEquityJob) => hasEquityJob.title === job.title)
    );

    return common;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(id) {
    const jobRes = await db.query(
      `SELECT title, salary, equity, company_Handle AS "companyHandle"
           FROM jobs WHERE id=$1`,
      [id]
    );
    const job = jobRes.rows[0];

    if (!job) throw new NotFoundError(`Job not found`);

    return job;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(id, data) {
    const { setCols, values } = sqlForPartialUpdate(data, {
      companyHandle: "company_Handle",
    });
    const handleVarIdx = "$" + (values.length + 1);
    const querySql = `UPDATE jobs 
                      SET ${setCols} 
                      WHERE id = ${handleVarIdx} 
                      RETURNING title, salary, equity, company_Handle AS "companyHandle"`;
    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`Job not found`);

    return job;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(id) {
    const result = await db.query(
      `DELETE
           FROM jobs
           WHERE id = $1
           RETURNING id`,
      [id]
    );
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`Job not found`);
  }
}

module.exports = Job;
