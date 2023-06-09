import * as jsonwebtoken from 'jsonwebtoken';
import bcrypt from 'bcrypt';

import { Context } from '../app';
import { UserRow } from '../daos/user';

type TokenData = {
  id: string;
};

type Units = {
  type: 'CITIZEN' | 'WORKER' | 'SOLDIER' | 'GUARD';
  quantity: number;
};

export default class UserModel {
  private ctx: Context;

  public id: number;
  public externalId: string;
  public username: string;
  public passwordHash: string;
  public email: string;
  public createdAt: Date;
  public updatedAt: Date;
  public gold: number;
  public units: Units[];
  public offensiveStrength: number;
  public defensiveStrength: number;
  public goldPerTurn: number;

  constructor(ctx: Context, userData: UserRow) {
    this.ctx = ctx;

    this.id = userData.id;
    this.externalId = userData.external_id;
    this.username = userData.username;
    this.passwordHash = userData.password_hash;
    this.email = userData.email;
    this.createdAt = userData.created_at;
    this.updatedAt = userData.updated_at;
    this.gold = userData.gold;
    this.units = userData.units ? JSON.parse(userData.units) : [];
    this.offensiveStrength = userData.offensive_strength;
    this.defensiveStrength = userData.defensive_strength;
    this.goldPerTurn = userData.gold_per_turn;
  }

  get population(): number {
    return this.units.reduce((acc, unit) => acc + unit.quantity, 0);
  }

  get armySize(): number {
    const miliatryUnits = this.units.filter(
      (unit) => unit.type !== 'CITIZEN' && unit.type !== 'WORKER'
    );
    return miliatryUnits.reduce((acc, unit) => acc + unit.quantity, 0);
  }

  async comparePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.passwordHash);
  }

  async generateAuthToken(): Promise<string> {
    const data: TokenData = {
      id: this.externalId,
    };
    return jsonwebtoken.sign(data, this.ctx.config.jwtSecret);
  }

  // STATIC METHODS

  static async fetchUserByExternalId(
    ctx: Context,
    externalId: string
  ): Promise<UserModel | null> {
    const user = await ctx.daoFactory.user.fetchUserByExternalId(externalId);
    if (!user) return null;

    return new UserModel(ctx, user);
  }

  static async fetchByToken(
    ctx: Context,
    token: string
  ): Promise<UserModel | null> {
    const tokenData = jsonwebtoken.verify(
      token,
      ctx.config.jwtSecret
    ) as TokenData;
    if (!tokenData) return null;

    const userData = await ctx.daoFactory.user.fetchUserByExternalId(
      tokenData.id
    );
    if (!userData) return null;

    return new UserModel(ctx, userData);
  }

  static async fetchUserByEmail(
    ctx: Context,
    email: string
  ): Promise<UserModel | null> {
    const user = await ctx.daoFactory.user.fetchUserByEmail(email);
    if (!user) return null;

    return new UserModel(ctx, user);
  }

  static async fetchUserByUsername(
    ctx: Context,
    username: string
  ): Promise<UserModel | null> {
    const user = await ctx.daoFactory.user.fetchUserByUsername(username);
    if (!user) return null;

    return new UserModel(ctx, user);
  }

  static async createUser(
    ctx: Context,
    username: string,
    email: string,
    password: string
  ): Promise<UserModel> {
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await ctx.daoFactory.user.createUser(
      username,
      passwordHash,
      email
    );

    return new UserModel(ctx, user);
  }
}
