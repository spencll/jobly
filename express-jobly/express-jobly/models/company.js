"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
      `SELECT handle
           FROM companies
           WHERE handle = $1`,
      [handle]
    );

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
      `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
      [handle, name, description, numEmployees, logoUrl]
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll() {
    const companiesRes = await db.query(
      `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           ORDER BY name`
    );
    return companiesRes.rows;
  }
  // Filter by name and returns [{ handle, name, description, numEmployees, logoUrl }, ...]
  static async name_filter(str) {
    const lower = str.toLowerCase();
    const companiesRes = await db.query(
      `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies WHERE LOWER(name) LIKE $1
           ORDER BY name`,
      [`%${lower}%`]
    );
    return companiesRes.rows;
  }

  // Filter by minimum number of employees
  // returns [{ handle, name, description, numEmployees, logoUrl }, ...]
  static async minEmployees_filter(num) {
    const companiesRes = await db.query(
      `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies WHERE num_employees>=$1
           ORDER BY num_employees`,
      [num]
    );
    return companiesRes.rows;
  }

  // Filter by max number of employees
  // returns [{ handle, name, description, numEmployees, logoUrl }, ...]

  static async maxEmployees_filter(num) {
    const companiesRes = await db.query(
      `SELECT handle,
                  name,
                  description,  
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
                  FROM companies WHERE num_employees<=$1
                  ORDER BY num_employees`,
      [num]
    );
    return companiesRes.rows;
  }

  // Combining all the filters into a super filter
  // I'm sure there's a easier way but this is where my brain ended up at lol
  // returns [{ handle, name, description, numEmployees, logoUrl }, ...]

  static async multi_filter(str, min, max) {
    const nameResults = str
      ? await Company.name_filter(str)
      : await Company.findAll();
    const minResults = min
      ? await Company.minEmployees_filter(min)
      : await Company.findAll();
    const maxResults = max
      ? await Company.maxEmployees_filter(max)
      : await Company.findAll();

    // Finding what's common between all the filtered results using name as the comparison property. 
    // Basically SQL JOIN but not using SQL query

    // For every nameResult, check if it's in minResults and maxResults as well
    // If so, we grab it

    const common = nameResults.filter(
      (company) =>
        minResults.some((minCompany) => minCompany.name === company.name) &&
        maxResults.some((maxCompany) => maxCompany.name === company.name)
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

  static async get(handle) {
    const companyRes = await db.query(
      `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
      [handle]
    );

    const company = companyRes.rows[0];
    if (!company) throw new NotFoundError(`No company: ${handle}`);

    const jobsRes = await db.query(
      `SELECT title, salary, equity, company_handle AS "companyHandle"
       FROM jobs
       WHERE company_handle = $1
       ORDER BY title`,
      [handle]
    );

    // Adding jobs key with job query result array where handle matches
    company.jobs = jobsRes.rows;

    return company;
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

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(data, {
      numEmployees: "num_employees",
      logoUrl: "logo_url",
    });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
      `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
      [handle]
    );
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}

module.exports = Company;
