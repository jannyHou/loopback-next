// Copyright IBM Corp. 2018. All Rights Reserved.
// Node module: @loopback/example-todo-list
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {Getter, inject} from '@loopback/core';
import {
  DefaultCrudRepository,
  HasManyRepositoryFactory,
  juggler,
  repository,
} from '@loopback/repository';
import {Todo, TodoList} from '../models';
import {TodoRepository} from './todo.repository';
import {InclusionHandlerFactory} from '@loopback/repository';

export class TodoListRepository extends DefaultCrudRepository<
  TodoList,
  typeof TodoList.prototype.id
> {
  public readonly todos: HasManyRepositoryFactory<
    Todo,
    typeof TodoList.prototype.id
  >;

  constructor(
    @inject('datasources.db') dataSource: juggler.DataSource,
    @repository.getter(TodoRepository)
    protected todoRepositoryGetter: Getter<TodoRepository>,
  ) {
    super(TodoList, dataSource);
    this.todos = this._createHasManyRepositoryFactoryFor(
      'todos',
      todoRepositoryGetter,
    );

    // to save time the fk name `todoListId` is provided here as a parameter,
    // but should be calculated in the inclusion handler factory,
    // details see my comment in the inclusion.ts file

    const todoHandler = InclusionHandlerFactory<
      Todo,
      typeof Todo.prototype.id,
      typeof TodoList.prototype.id
    >(todoRepositoryGetter, 'todoListId');
    this._inclusionHandler.todos = todoHandler;
  }

  public findByTitle(title: string) {
    return this.findOne({where: {title}});
  }
}
