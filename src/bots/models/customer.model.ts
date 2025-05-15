import { Column, DataType, Model, Table } from "sequelize-typescript";

interface ICustomerCreationAttr {
  user_id: number;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: string;
  specialization?: string;
  address?: string;
  location?: object;
  is_active: boolean;
  workshop_name?: string;
  work_address?: string;
  work_start_time?: string;
  work_end_time?: string;
  service_time?: number;
}

@Table({ tableName: "customers" })
export class Customer extends Model<Customer, ICustomerCreationAttr> {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @Column({
    type: DataType.BIGINT,
    unique: true,
  })
  declare user_id: number;

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
    type: DataType.ENUM("client", "master"),
    allowNull: false,
  })
  declare role: string;

  @Column({
    type: DataType.ENUM(
      "barber",
      "plumber",
      "repairman",
      "electrician",
      "carpenter"
    ),
    allowNull: true,
  })
  declare specialization: string;

  @Column({
    type: DataType.STRING(200),
    allowNull: true,
  })
  declare address: string;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  declare location: object;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  declare is_active: boolean;

  @Column({
    type: DataType.STRING(3),
    defaultValue: "uz",
  })
  declare language: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  declare workshop_name: string;

  @Column({
    type: DataType.STRING(200),
    allowNull: true,
  })
  declare work_address: string;

  @Column({
    type: DataType.STRING(5),
    allowNull: true,
  })
  declare work_start_time: string;

  @Column({
    type: DataType.STRING(5),
    allowNull: true,
  })
  declare work_end_time: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  declare service_time: number;
}
