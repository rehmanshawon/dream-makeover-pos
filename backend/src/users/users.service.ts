import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const existing = await this.userRepository.findOne({
      where: { username: dto.username },
    });

    if (existing) {
      throw new ConflictException('Username already exists');
    }

    const user = this.userRepository.create({
      username: dto.username,
      displayName: dto.displayName,
      role: dto.role,
      active: dto.active ?? true,
    });

    await user.setPassword(dto.password);

    const saved = await this.userRepository.save(user);
    return this.toResponseDto(saved);
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.userRepository.find({
      order: { createdAt: 'DESC' },
    });
    return users.map((user) => this.toResponseDto(user));
  }

  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toResponseDto(user);
  }

  /**
   * Partially updates a user.
   *
   * Safeguards:
   * - A user cannot deactivate themselves.
   * - A user cannot change their own role.
   *
   * These prevent the last admin from locking the system out.
   */
  async update(
    targetUserId: string,
    callingUserId: string,
    dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: targetUserId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.active === false && targetUserId === callingUserId) {
      throw new BadRequestException('You cannot deactivate your own account');
    }

    if (dto.role !== undefined && targetUserId === callingUserId) {
      throw new BadRequestException('You cannot change your own role');
    }

    if (dto.displayName !== undefined) user.displayName = dto.displayName;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.active !== undefined) user.active = dto.active;

    const saved = await this.userRepository.save(user);
    return this.toResponseDto(saved);
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  async verifyPassword(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
  }

  /**
   * Fetches the raw user entity including the password hash.
   *
   * Used only by auth flows. Do not return this to clients.
   */
  async findByIdRaw(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  /**
   * Sets a new password for the given user.
   *
   * The plaintext is hashed before saving. The entity's setPassword
   * helper handles salt generation.
   */
  async setPassword(userId: string, plainPassword: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await user.setPassword(plainPassword);
    await this.userRepository.save(user);
  }

  private toResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
