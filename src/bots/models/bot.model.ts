import { Column, DataType, Model, Table } from "sequelize-typescript";

interface IBotCreationAttr {
  userId: number;
  username: string;
  first_name: string;
  last_name: string;
  lang: string;
}

@Table({ tableName: "bot" })
export class Bot extends Model<Bot, IBotCreationAttr> {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
  })
  declare userId: number;

  @Column({
    type: DataType.STRING(100),
  })
  declare username: string;

  @Column({
    type: DataType.STRING(50),
  })
  declare first_name: string;

  @Column({
    type: DataType.STRING(50),
  })
  declare last_name: string;

  @Column({
    type: DataType.STRING(15),
  })
  declare phone_number: string;

  @Column({
    type: DataType.STRING(3),
  })
  declare lang: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  declare status: boolean;

  @Column({
    type: DataType.STRING(10),
    allowNull: true,
  })
  declare role: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
  })
  declare specialization: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  declare address: string;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  declare location: object;
}
